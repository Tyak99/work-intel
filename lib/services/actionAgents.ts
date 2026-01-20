import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { SmartTodoItem, SmartTodoAction, Brief, BriefListItem, MeetingItem } from '@/lib/types';
import { getEmailById, EmailMessage } from './gmail';
import { getEventDetails, CalendarEvent } from './calendar';

function loadAnthropicApiKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match && match[1]) {
      const raw = match[1].trim();
      const cleaned = raw.replace(/^\"|\"$/g, '');
      process.env.ANTHROPIC_API_KEY = cleaned;
      return cleaned;
    }
  } catch (error) {
    console.warn('Unable to load ANTHROPIC_API_KEY from .env.local:', error);
  }

  return undefined;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function getDefaultActions(): SmartTodoAction[] {
  return [
    { label: 'Copy to Clipboard', type: 'copy' },
    { label: 'Regenerate', type: 'regenerate' },
    { label: 'Skip', type: 'skip' },
  ];
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  useExtendedThinking: boolean = false
): Promise<string> {
  const apiKey = loadAnthropicApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing');
  }

  const anthropic = new Anthropic({ apiKey });

  if (useExtendedThinking) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000,
      },
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
    });

    // Extract text from response, handling thinking blocks
    const textBlocks = response.content.filter(block => block.type === 'text');
    return textBlocks.map(block => ('text' in block ? block.text : '')).join('\n');
  } else {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textBlocks = response.content.filter(block => block.type === 'text');
    return textBlocks.map(block => ('text' in block ? block.text : '')).join('\n');
  }
}

// Email Reply Agent
export async function prepareEmailReply(
  emailId: string,
  userId: string,
  briefItem?: BriefListItem
): Promise<SmartTodoItem> {
  const id = generateId();
  const briefItemId = briefItem?.id || emailId;

  try {
    // Fetch the email
    const email = await getEmailById(userId, emailId);

    const systemPrompt = `You are an expert email assistant helping a busy professional draft replies.
Write concise, professional email replies that:
- Address the sender's main points or questions
- Are friendly but efficient
- Include appropriate greeting and sign-off
- Are ready to copy and send with minimal editing

Output ONLY the email reply text, no explanations or headers.`;

    const userPrompt = `Draft a reply to this email:

From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

Content:
${email.body || email.snippet}

---
Write a professional reply addressing their message.`;

    const draftContent = await callClaude(systemPrompt, userPrompt, false);

    return {
      id,
      briefItemId,
      type: 'email_reply',
      title: `Reply to: ${email.subject}`,
      originalContent: {
        from: email.from,
        subject: email.subject,
        date: email.date.toISOString(),
        body: email.body || email.snippet,
      },
      draftContent: draftContent.trim(),
      actions: getDefaultActions(),
      status: 'ready',
    };
  } catch (error) {
    console.error('Error preparing email reply:', error);
    return {
      id,
      briefItemId,
      type: 'email_reply',
      title: 'Email Reply',
      actions: getDefaultActions(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to prepare email reply',
    };
  }
}

// PR Nudge Agent
export async function preparePRNudge(
  prNumber: number,
  repo: string,
  reviewers: string[],
  briefItem?: BriefListItem
): Promise<SmartTodoItem> {
  const id = generateId();
  const briefItemId = briefItem?.id || `pr-${prNumber}`;

  try {
    const systemPrompt = `You are a helpful assistant drafting polite follow-up messages for pull request reviews.
Write a brief, friendly message to nudge reviewers about a pending PR review.
The message should be:
- Polite and not pushy
- Brief (2-3 sentences max)
- Professional but friendly
- Include context about the PR

Output ONLY the message text, ready to paste into Slack or a PR comment.`;

    const reviewerNames = reviewers.length > 0
      ? reviewers.join(', ')
      : 'the assigned reviewers';

    const userPrompt = `Write a polite nudge message for this PR:

PR #${prNumber} in ${repo}
Title: ${briefItem?.title || 'Pull Request'}
Summary: ${briefItem?.summary || 'Awaiting review'}
Reviewers: ${reviewerNames}

Draft a friendly reminder asking for a review.`;

    const draftContent = await callClaude(systemPrompt, userPrompt, false);

    return {
      id,
      briefItemId,
      type: 'pr_nudge',
      title: `Nudge: PR #${prNumber}`,
      originalContent: {
        prNumber,
        repo,
        reviewers,
        title: briefItem?.title,
        summary: briefItem?.summary,
      },
      draftContent: draftContent.trim(),
      actions: getDefaultActions(),
      status: 'ready',
    };
  } catch (error) {
    console.error('Error preparing PR nudge:', error);
    return {
      id,
      briefItemId,
      type: 'pr_nudge',
      title: `PR #${prNumber} Nudge`,
      actions: getDefaultActions(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to prepare PR nudge',
    };
  }
}

// Meeting Prep Agent
export async function prepareMeetingPrep(
  meetingId: string,
  userId: string,
  briefContext?: Brief
): Promise<SmartTodoItem> {
  const id = generateId();
  const briefItemId = meetingId;

  try {
    // Try to fetch meeting details
    let meeting: CalendarEvent | null = null;
    try {
      meeting = await getEventDetails(userId, meetingId);
    } catch (e) {
      console.warn('Could not fetch meeting details:', e);
    }

    // Find the meeting in brief if available
    const briefMeeting = briefContext?.meetings?.find(m => m.id === meetingId);

    // Build context from related brief items
    const relatedContext: string[] = [];

    if (briefContext) {
      // Find related emails, PRs, tasks that mention attendees or meeting topics
      const attendees = meeting?.attendees.map(a => a.email) || briefMeeting?.attendees || [];
      const meetingTitle = meeting?.title || briefMeeting?.title || '';

      // Check emails
      briefContext.emailsToActOn?.forEach(email => {
        const emailFrom = email.title.toLowerCase();
        if (attendees.some(a => emailFrom.includes(a.split('@')[0].toLowerCase()))) {
          relatedContext.push(`Related Email: ${email.title} - ${email.summary}`);
        }
      });

      // Check PRs
      briefContext.prsToReview?.forEach(pr => {
        if (pr.title.toLowerCase().includes(meetingTitle.toLowerCase().split(' ')[0])) {
          relatedContext.push(`Related PR: ${pr.title} - ${pr.summary}`);
        }
      });

      briefContext.myPrsWaiting?.forEach(pr => {
        if (pr.title.toLowerCase().includes(meetingTitle.toLowerCase().split(' ')[0])) {
          relatedContext.push(`Your PR: ${pr.title} - ${pr.summary}`);
        }
      });

      // Check Jira tasks
      briefContext.jiraTasks?.forEach(task => {
        if (task.title.toLowerCase().includes(meetingTitle.toLowerCase().split(' ')[0])) {
          relatedContext.push(`Related Task: ${task.title} - ${task.summary}`);
        }
      });
    }

    const systemPrompt = `You are an expert meeting preparation assistant for a senior software engineer.
Generate concise, actionable meeting prep notes that include:
- Key talking points (2-4 bullet points)
- Questions to ask or topics to raise
- Any relevant context from related work items
- Suggested preparation actions if time permits

Format the output as clean markdown bullet points, ready to reference during the meeting.
Be concise and focus on what's actionable.`;

    const meetingInfo = meeting
      ? `Meeting: ${meeting.title}
Time: ${meeting.startTime.toLocaleString()} - ${meeting.endTime.toLocaleString()}
Attendees: ${meeting.attendees.map(a => a.name || a.email).join(', ')}
Description: ${meeting.description || 'No description'}
${meeting.conferenceData?.url ? `Meeting Link: ${meeting.conferenceData.url}` : ''}`
      : briefMeeting
        ? `Meeting: ${briefMeeting.title}
Time: ${briefMeeting.time}
Attendees: ${briefMeeting.attendees.join(', ')}
${briefMeeting.prepNeeded ? `Prep Notes: ${briefMeeting.prepNeeded}` : ''}`
        : `Meeting ID: ${meetingId}`;

    const contextSection = relatedContext.length > 0
      ? `\n\nRelated work context:\n${relatedContext.join('\n')}`
      : '';

    const userPrompt = `Prepare meeting notes for:

${meetingInfo}
${contextSection}

Generate actionable prep notes for this meeting.`;

    // Use extended thinking for meeting prep since it benefits from deeper analysis
    const draftContent = await callClaude(systemPrompt, userPrompt, true);

    return {
      id,
      briefItemId,
      type: 'meeting_prep',
      title: `Prep: ${meeting?.title || briefMeeting?.title || 'Meeting'}`,
      originalContent: {
        meetingId,
        title: meeting?.title || briefMeeting?.title,
        time: meeting?.startTime.toISOString() || briefMeeting?.time,
        attendees: meeting?.attendees.map(a => a.email) || briefMeeting?.attendees,
        description: meeting?.description,
        relatedItems: relatedContext,
      },
      draftContent: draftContent.trim(),
      actions: getDefaultActions(),
      status: 'ready',
    };
  } catch (error) {
    console.error('Error preparing meeting prep:', error);
    return {
      id,
      briefItemId,
      type: 'meeting_prep',
      title: 'Meeting Prep',
      actions: getDefaultActions(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to prepare meeting notes',
    };
  }
}

// Main dispatcher function
export async function prepareAction(
  type: 'email_reply' | 'pr_nudge' | 'meeting_prep',
  sourceId: string,
  userId: string,
  briefContext?: Brief,
  additionalData?: Record<string, any>
): Promise<SmartTodoItem> {
  switch (type) {
    case 'email_reply': {
      const briefItem = briefContext?.emailsToActOn?.find(e => e.sourceId === sourceId);
      return prepareEmailReply(sourceId, userId, briefItem);
    }
    case 'pr_nudge': {
      const briefItem = briefContext?.myPrsWaiting?.find(pr => pr.sourceId === sourceId);
      const prNumber = parseInt(sourceId, 10) || 0;
      const repo = additionalData?.repo || briefItem?.context || 'unknown/unknown';
      const reviewers = additionalData?.reviewers || [];
      return preparePRNudge(prNumber, repo, reviewers, briefItem);
    }
    case 'meeting_prep': {
      return prepareMeetingPrep(sourceId, userId, briefContext);
    }
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}
