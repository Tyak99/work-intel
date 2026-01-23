import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/services/auth';
import type { Brief, BriefListItem, MeetingItem } from '@/lib/types';

// Request schema
const RequestSchema = z.object({
  brief: z.any(), // We'll validate the brief structure loosely
  maxSuggestions: z.number().min(1).max(10).optional().default(5),
});

// Suggestion schema (matches our types)
const SuggestionActionSchema = z.object({
  label: z.string(),
  action: z.object({
    type: z.enum(['draft_email_reply', 'draft_pr_nudge', 'draft_meeting_prep', 'open_url', 'copy_to_clipboard', 'dismiss', 'snooze']),
    sourceId: z.string().optional(),
    source: z.enum(['github', 'email', 'calendar', 'jira']).optional(),
    url: z.string().optional(),
    content: z.string().optional(),
    duration: z.number().optional(),
  }),
  variant: z.enum(['default', 'primary', 'secondary', 'ghost']).optional(),
  icon: z.string().optional(),
  confirmRequired: z.boolean().optional(),
});

const SuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  reason: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.enum(['github', 'email', 'calendar', 'jira']),
  sourceId: z.string(),
  actions: z.array(SuggestionActionSchema),
});

const ResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

// System prompt for generating suggestions
const SYSTEM_PROMPT = `You are an AI assistant that analyzes a user's work brief and generates proactive, actionable suggestions. Each suggestion should:

1. Be specific and contextual - reference actual items from the brief
2. Include a clear REASON explaining WHY this needs attention (e.g., "Sarah has been waiting 3 days")
3. Prioritize based on urgency and impact
4. Provide relevant actions the user can take

IMPORTANT GUIDELINES:
- Focus on items that are time-sensitive, blocking others, or require immediate attention
- Be concise but specific in your reasons
- Suggest actions that add value (drafting replies, nudging, preparing)
- Consider relationships between items (e.g., upcoming meeting + related PR)

OUTPUT FORMAT - Return ONLY valid JSON matching this structure:
{
  "suggestions": [
    {
      "id": "unique-id-based-on-source",
      "title": "Brief, clear title (max 60 chars)",
      "subtitle": "Optional secondary info (e.g., person name, project)",
      "reason": "WHY this needs attention - be specific with time, impact, context",
      "urgency": "critical|high|medium|low",
      "source": "github|email|calendar|jira",
      "sourceId": "original item ID from brief",
      "actions": [
        {
          "label": "Action text (max 20 chars)",
          "action": {
            "type": "draft_email_reply|draft_pr_nudge|draft_meeting_prep|open_url",
            "sourceId": "item ID",
            "source": "github|email|calendar|jira",
            "url": "optional URL for open_url action"
          },
          "variant": "primary|secondary|default",
          "icon": "external|copy|clock"
        }
      ]
    }
  ]
}

Limit to ${3}-${5} most important suggestions. Quality over quantity.`;

export async function POST(request: Request) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { brief, maxSuggestions } = RequestSchema.parse(body);

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    // Build context from brief
    const briefContext = buildBriefContext(brief);

    if (!briefContext.trim()) {
      return NextResponse.json({
        suggestions: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Call Claude to generate suggestions
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT.replace('${3}', '3').replace('${5}', String(maxSuggestions)),
      messages: [
        {
          role: 'user',
          content: `Analyze this work brief and generate proactive suggestions:\n\n${briefContext}\n\nReturn ONLY valid JSON.`,
        },
      ],
    });

    // Extract and parse response
    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response');
      return NextResponse.json({
        suggestions: [],
        generatedAt: new Date().toISOString(),
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse Claude response as JSON');
      return NextResponse.json({
        suggestions: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Validate and filter suggestions
    const validatedResponse = ResponseSchema.safeParse(parsed);

    if (!validatedResponse.success) {
      console.error('Invalid suggestion format:', validatedResponse.error);
      // Try to salvage partial data
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s: any) => s.id && s.title && s.reason && s.source)
            .slice(0, maxSuggestions)
        : [];

      return NextResponse.json({
        suggestions,
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      suggestions: validatedResponse.data.suggestions.slice(0, maxSuggestions),
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Helper to build context from brief
function buildBriefContext(brief: Brief): string {
  const sections: string[] = [];

  // Summary
  if (brief.summary) {
    sections.push(`SUMMARY: ${brief.summary}`);
  }

  // Top Focus
  if (brief.topFocus && brief.topFocus.length > 0) {
    sections.push('\nTOP PRIORITIES:');
    brief.topFocus.forEach((item, i) => {
      sections.push(`${i + 1}. ${item.title} - ${item.reason}`);
    });
  }

  // PRs to Review
  if (brief.prsToReview && brief.prsToReview.length > 0) {
    sections.push('\nPRs TO REVIEW:');
    brief.prsToReview.forEach(pr => {
      sections.push(`- [${pr.sourceId}] ${pr.title} | Priority: ${pr.priority} | ${pr.summary}${pr.url ? ` | URL: ${pr.url}` : ''}`);
    });
  }

  // My PRs Waiting
  if (brief.myPrsWaiting && brief.myPrsWaiting.length > 0) {
    sections.push('\nMY PRs WAITING FOR REVIEW:');
    brief.myPrsWaiting.forEach(pr => {
      sections.push(`- [${pr.sourceId}] ${pr.title} | Priority: ${pr.priority} | ${pr.summary}${pr.url ? ` | URL: ${pr.url}` : ''}`);
    });
  }

  // Emails
  if (brief.emailsToActOn && brief.emailsToActOn.length > 0) {
    sections.push('\nEMAILS REQUIRING ACTION:');
    brief.emailsToActOn.forEach(email => {
      sections.push(`- [${email.sourceId}] ${email.title} | Priority: ${email.priority} | ${email.summary}`);
    });
  }

  // Meetings
  if (brief.meetings && brief.meetings.length > 0) {
    sections.push('\nTODAY\'S MEETINGS:');
    brief.meetings.forEach(meeting => {
      const attendeeCount = meeting.attendees?.length || 0;
      sections.push(`- [${meeting.id}] ${meeting.time}: ${meeting.title} (${attendeeCount} attendees)${meeting.prepNeeded ? ` | Prep: ${meeting.prepNeeded}` : ''}${meeting.url ? ` | URL: ${meeting.url}` : ''}`);
    });
  }

  // Jira Tasks
  if (brief.jiraTasks && brief.jiraTasks.length > 0) {
    sections.push('\nJIRA TASKS:');
    brief.jiraTasks.forEach(task => {
      sections.push(`- [${task.sourceId}] ${task.title} | Priority: ${task.priority} | ${task.summary}${task.deadline ? ` | Due: ${task.deadline}` : ''}${task.url ? ` | URL: ${task.url}` : ''}`);
    });
  }

  // Alerts
  if (brief.alerts && brief.alerts.length > 0) {
    sections.push('\nALERTS:');
    brief.alerts.forEach(alert => {
      sections.push(`- [${alert.type.toUpperCase()}] ${alert.title}: ${alert.description}`);
    });
  }

  return sections.join('\n');
}
