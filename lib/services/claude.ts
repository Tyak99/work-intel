import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Brief, BriefListItem, BriefFocusItem, MeetingItem, BriefAlert } from '@/lib/types';
import { buildCondensedBriefContext, ToolData } from './briefProcessing';

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

const BriefItemSchema = z.object({
  id: z.string(),
  source: z.enum(['email', 'calendar', 'github', 'jira']),
  sourceId: z.string(),
  title: z.string(),
  summary: z.string().max(200),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  actionNeeded: z.boolean(),
  actionType: z.enum(['respond', 'review', 'attend', 'complete', 'investigate']).optional(),
  deadline: z.string().optional(),
  context: z.string().max(300).optional(),
  url: z.string().optional(),
});

const FocusItemSchema = z.object({
  rank: z.number(),
  title: z.string(),
  reason: z.string(),
  relatedItemId: z.string(),
});

const MeetingItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),
  attendees: z.array(z.string()),
  prepNeeded: z.string().optional(),
  relatedItems: z.array(z.string()).optional(),
  url: z.string().optional(),
});

const BriefOutputSchema = z.object({
  generatedAt: z.string(),
  topFocus: z.array(FocusItemSchema).max(3),
  meetings: z.array(MeetingItemSchema),
  prsToReview: z.array(BriefItemSchema),
  myPrsWaiting: z.array(BriefItemSchema),
  emailsToActOn: z.array(BriefItemSchema),
  jiraTasks: z.array(BriefItemSchema),
  alerts: z.array(z.object({
    type: z.enum(['outage', 'production_error', 'deadline', 'blocker']),
    title: z.string(),
    description: z.string(),
    sourceId: z.string(),
  })).optional(),
  summary: z.string().max(500),
});

const PartialBriefOutputSchema = BriefOutputSchema.partial();

const SYSTEM_PROMPT = `You are an executive assistant for a senior software engineer. Your job is to analyze their work data and provide a smart, prioritized daily brief.

ANALYSIS GUIDELINES:
1. Meetings: What's on the calendar today? Any prep needed?
2. PRs to Review: Which PRs am I assigned to review but haven't reviewed?
3. My PRs Waiting: Which of my PRs are waiting for review from others?
4. Emails to Act On: Which emails need a response? Filter intelligently:
   - AWS notifications: Only flag if service degradation/outage
   - Sentry errors: Flag if production critical
   - Marketing/newsletters: Skip unless explicitly subscribed
   - Personal/team emails: Always include if needs response
5. Jira Tasks: What's in progress? What's blocked? What's due soon?
6. Focus Recommendation: Based on all data, what should be the top 3 priorities?

IMPORTANT: Preserve URLs from the context data. When an item has a "url" field in the input, include it in your output.

OUTPUT FORMAT - Return ONLY this exact JSON structure:
{
  "generatedAt": "ISO timestamp",
  "topFocus": [
    {"rank": 1, "title": "string", "reason": "string", "relatedItemId": "string"}
  ],
  "meetings": [
    {"id": "string", "title": "string", "time": "10:00 AM - 11:00 AM", "attendees": ["email"], "prepNeeded": "optional string", "url": "optional calendar link"}
  ],
  "prsToReview": [
    {"id": "pr-123", "source": "github", "sourceId": "123", "title": "PR title", "summary": "why review needed", "priority": "high|medium|low|critical", "actionNeeded": true, "actionType": "review", "url": "optional PR link"}
  ],
  "myPrsWaiting": [
    {"id": "pr-456", "source": "github", "sourceId": "456", "title": "PR title", "summary": "who is blocking", "priority": "high|medium|low", "actionNeeded": true, "actionType": "investigate", "url": "optional PR link"}
  ],
  "emailsToActOn": [
    {"id": "email-id", "source": "email", "sourceId": "email-id", "title": "Subject line", "summary": "why action needed", "priority": "critical|high|medium|low", "actionNeeded": true, "actionType": "respond|investigate"}
  ],
  "jiraTasks": [
    {"id": "PROJ-123", "source": "jira", "sourceId": "PROJ-123", "title": "Task title", "summary": "status and context", "priority": "high|medium|low", "actionNeeded": true, "actionType": "complete", "deadline": "optional", "url": "optional Jira link"}
  ],
  "alerts": [
    {"type": "production_error|outage|deadline|blocker", "title": "string", "description": "string", "sourceId": "string"}
  ],
  "summary": "1-2 sentence overview of the day"
}`;

export async function processBriefWithClaude(toolData: ToolData, userContext?: any): Promise<Brief> {
  const condensedContext = buildCondensedBriefContext(toolData);
  const prompt = `Here is the condensed work context in JSON. Use only this data to generate the brief.
\nCONTEXT JSON:\n${JSON.stringify(condensedContext, null, 2)}\n\nReturn ONLY valid JSON for BriefOutput.`;
  let rawText = '';

  try {
    const apiKey = loadAnthropicApiKey();
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is missing.'); 
      return createFallbackBrief();
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.2,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');
    const jsonPayload = extractJson(rawText);
    const parsed = normalizeBriefOutput(parseModelJson(jsonPayload));

    const generatedAt = new Date(parsed.generatedAt);
    const safeGeneratedAt = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;

    const brief: Brief = {
      id: Math.random().toString(36).slice(2, 9),
      generatedAt: safeGeneratedAt,
      sections: buildSectionsFromBrief(parsed),
      topFocus: parsed.topFocus as BriefFocusItem[],
      meetings: parsed.meetings as MeetingItem[],
      prsToReview: parsed.prsToReview as BriefListItem[],
      myPrsWaiting: parsed.myPrsWaiting as BriefListItem[],
      emailsToActOn: parsed.emailsToActOn as BriefListItem[],
      jiraTasks: parsed.jiraTasks as BriefListItem[],
      alerts: parsed.alerts as BriefAlert[] | undefined,
      summary: parsed.summary
    };

    return brief;
  } catch (error) {
    try {
      const logPath = `/tmp/brief-error-${Date.now()}.log`;
      const logBody = [
        'Brief generation failed.',
        error instanceof Error ? error.stack || error.message : String(error),
        '--- Raw Response ---',
        rawText || '(empty)',
      ].join('\n');
      fs.writeFileSync(logPath, logBody);
      console.error(`Brief generation error logged to ${logPath}`);
    } catch (logError) {
      console.error('Failed to write brief error log:', logError);
    }
    console.error('Executive brief generation failed:', error);
    return createFallbackBrief();
  }
}

function extractJson(value: string) {
  const fenced = value.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON found in model response');
  }
  return match[0];
}

function normalizeBriefOutput(payload: any): z.infer<typeof BriefOutputSchema> {
  const partial = PartialBriefOutputSchema.safeParse(payload);
  if (!partial.success) {
    const coerced = coerceLegacyPayload(payload);
    const coercedParse = PartialBriefOutputSchema.safeParse(coerced);
    if (!coercedParse.success) {
      throw new Error('Brief JSON failed basic validation');
    }
    return normalizeFromPartial(coercedParse.data);
  }

  return normalizeFromPartial(partial.data);
}

function normalizeFromPartial(partial: z.infer<typeof PartialBriefOutputSchema>) {
  const normalized = {
    generatedAt: typeof partial.generatedAt === 'string'
      ? partial.generatedAt
      : new Date().toISOString(),
    topFocus: parseArray(partial.topFocus, FocusItemSchema),
    meetings: parseArray(partial.meetings, MeetingItemSchema),
    prsToReview: parseArray(partial.prsToReview, BriefItemSchema),
    myPrsWaiting: parseArray(partial.myPrsWaiting, BriefItemSchema),
    emailsToActOn: parseArray(partial.emailsToActOn, BriefItemSchema),
    jiraTasks: parseArray(partial.jiraTasks, BriefItemSchema),
    alerts: parseArray(
      partial.alerts,
      z.object({
        type: z.enum(['outage', 'production_error', 'deadline', 'blocker']),
        title: z.string(),
        description: z.string(),
        sourceId: z.string(),
      })
    ),
    summary: typeof partial.summary === 'string'
      ? partial.summary
      : 'Daily brief generated.',
  };

  return BriefOutputSchema.parse(normalized);
}

function coerceLegacyPayload(payload: any) {
  const coerced: Record<string, any> = { ...payload };

  if (Array.isArray(payload.focusRecommendations)) {
    coerced.topFocus = payload.focusRecommendations.map((item: any, index: number) => ({
      rank: typeof item.priority === 'number' ? item.priority : index + 1,
      title: item.task || item.title || `Focus ${index + 1}`,
      reason: item.description || item.reason || '',
      relatedItemId: `focus-${index + 1}`,
    }));
  }

  if (payload.myPRsWaiting && !payload.myPrsWaiting) {
    coerced.myPrsWaiting = payload.myPRsWaiting;
  }

  if (!Array.isArray(payload.meetings)) {
    coerced.meetings = [];
  }

  if (Array.isArray(payload.prsToReview)) {
    coerced.prsToReview = payload.prsToReview.map((item: any, index: number) =>
      toBriefItem(item, {
        fallbackTitle: item.title || `PR ${index + 1}`,
        source: 'github',
        actionType: 'review',
      })
    );
  }

  if (Array.isArray(payload.myPrsWaiting)) {
    coerced.myPrsWaiting = payload.myPrsWaiting.map((item: any, index: number) =>
      toBriefItem(item, {
        fallbackTitle: item.title || `PR ${index + 1}`,
        source: 'github',
        actionType: 'investigate',
      })
    );
  }

  if (Array.isArray(payload.emailsToActOn)) {
    coerced.emailsToActOn = payload.emailsToActOn.map((item: any, index: number) =>
      toBriefItem(item, {
        fallbackTitle: item.subject || item.title || `Email ${index + 1}`,
        source: 'email',
        actionType: 'respond',
      })
    );
  }

  if (payload.jiraTasks) {
    const jiraItems = Array.isArray(payload.jiraTasks)
      ? payload.jiraTasks
      : [
          ...(payload.jiraTasks.inProgress || []),
          ...(payload.jiraTasks.blocked || []),
          ...(payload.jiraTasks.dueSoon || []),
        ];
    coerced.jiraTasks = jiraItems.map((item: any, index: number) =>
      toBriefItem(item, {
        fallbackTitle: item.title || item.summary || item.key || `Jira ${index + 1}`,
        source: 'jira',
        actionType: 'complete',
      })
    );
  }

  if (typeof payload.summary !== 'string') {
    coerced.summary = 'Daily brief generated.';
  }

  return coerced;
}

function toBriefItem(
  item: any,
  options: { fallbackTitle: string; source: 'email' | 'calendar' | 'github' | 'jira'; actionType: BriefListItem['actionType'] }
): BriefListItem {
  const sourceId = item.sourceId || item.id || item.key || item.number || item.subject || options.fallbackTitle;
  const summary = item.summary || item.reason || item.description || '';

  return {
    id: String(sourceId),
    source: options.source,
    sourceId: String(sourceId),
    title: item.title || item.subject || options.fallbackTitle,
    summary,
    priority: normalizePriority(item.priority),
    actionNeeded: true,
    actionType: options.actionType,
    deadline: item.deadline || item.dueDate || item.due || undefined,
    context: item.context || item.reason || undefined,
  };
}

function normalizePriority(value: any): BriefListItem['priority'] {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function parseModelJson(payload: string) {
  const trimmed = payload.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const cleaned = trimmed
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([,{]\s*)([A-Za-z0-9_]+)\s*:/g, '$1\"$2\":')
      .replace(/'([^']*)'/g, (_, value) => `\"${value.replace(/\"/g, '\\\\\"')}\"`);

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      const evaluator = new Function(`return (${cleaned})`);
      return evaluator();
    }
  }
}

function parseArray<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<T[]>((acc, item) => {
    const result = schema.safeParse(item);
    if (result.success) acc.push(result.data);
    return acc;
  }, []);
}

function buildSectionsFromBrief(parsed: z.infer<typeof BriefOutputSchema>) {
  const sections = [] as Brief['sections'];

  if (parsed.alerts && parsed.alerts.length > 0) {
    sections.push({
      id: 'alerts',
      type: 'critical',
      title: 'Alerts',
      items: parsed.alerts.map(alert => ({
        title: alert.title,
        description: alert.description,
        priority: 'critical',
        source: 'alert',
        sourceId: alert.sourceId,
      }))
    });
  }

  sections.push({
    id: 'meetings',
    type: 'meetings',
    title: 'Meetings',
    items: parsed.meetings.map(meeting => ({
      title: meeting.title,
      description: `${meeting.time}${meeting.prepNeeded ? ` • Prep: ${meeting.prepNeeded}` : ''}`,
      priority: 'medium',
      source: 'calendar',
      sourceId: meeting.id
    }))
  });

  sections.push({
    id: 'prsToReview',
    type: 'reviews',
    title: 'PRs To Review',
    items: parsed.prsToReview.map(item => ({
      title: item.title,
      description: item.summary,
      priority: item.priority,
      source: item.source,
      sourceId: item.sourceId,
      deadline: item.deadline,
      aiInsights: item.context
    }))
  });

  sections.push({
    id: 'myPrsWaiting',
    type: 'progress',
    title: 'My PRs Waiting',
    items: parsed.myPrsWaiting.map(item => ({
      title: item.title,
      description: item.summary,
      priority: item.priority,
      source: item.source,
      sourceId: item.sourceId,
      deadline: item.deadline,
      aiInsights: item.context
    }))
  });

  sections.push({
    id: 'emails',
    type: 'emails',
    title: 'Emails To Act On',
    items: parsed.emailsToActOn.map(item => ({
      title: item.title,
      description: item.summary,
      priority: item.priority,
      source: item.source,
      sourceId: item.sourceId,
      deadline: item.deadline,
      aiInsights: item.context
    }))
  });

  sections.push({
    id: 'jira',
    type: 'progress',
    title: 'Jira Tasks',
    items: parsed.jiraTasks.map(item => ({
      title: item.title,
      description: item.summary,
      priority: item.priority,
      source: item.source,
      sourceId: item.sourceId,
      deadline: item.deadline,
      aiInsights: item.context
    }))
  });

  return sections;
}

function createFallbackBrief(): Brief {
  const now = new Date();
  return {
    id: Math.random().toString(36).slice(2, 9),
    generatedAt: now,
    sections: [
      {
        id: 'fallback',
        type: 'observations',
        title: 'Brief Unavailable',
        items: [
          {
            title: 'Brief generation failed',
            description: 'Unable to analyze data - please check configuration.',
            priority: 'high'
          }
        ]
      }
    ],
    topFocus: [],
    meetings: [],
    prsToReview: [],
    myPrsWaiting: [],
    emailsToActOn: [],
    jiraTasks: [],
    alerts: [],
    summary: 'Brief generation failed. Please check logs and connection status.'
  };
}
