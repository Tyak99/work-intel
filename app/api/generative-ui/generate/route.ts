import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/services/auth';
import type { Brief } from '@/lib/types';

// Request schema
const RequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  brief: z.any(),
  model: z.enum(['sonnet', 'haiku']).optional().default('haiku'),
});

// Model ID mapping
const modelMap = {
  sonnet: 'claude-sonnet-4-20250514',
  haiku: 'claude-3-5-haiku-20241022',
} as const;

// UI Node schema for validation
const UINodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string(),
    props: z.record(z.any()),
    children: z.array(UINodeSchema).optional(),
  })
);

const ViewResponseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  tree: UINodeSchema,
});

// System prompt for generating UI
const SYSTEM_PROMPT = `You are a UI generation AI that creates custom views from user requests. You have access to a specific component catalog and must ONLY use components from this catalog.

AVAILABLE COMPONENTS:

1. Layout Components:
   - Stack: { direction: "horizontal"|"vertical", spacing: "none"|"xs"|"sm"|"md"|"lg"|"xl", align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between"|"around" }
   - Grid: { columns: 1-6, gap: "none"|"xs"|"sm"|"md"|"lg"|"xl" }

2. Content Components:
   - Card: { title: string, description?: string, source?: "github"|"email"|"calendar"|"jira", sourceId?: string, priority?: "low"|"medium"|"high"|"critical", url?: string, metadata?: Record<string, string> }
   - Text: { content: string, variant?: "body"|"heading"|"subheading"|"caption"|"code", color?: "default"|"muted"|"primary"|"success"|"warning"|"error" }
   - Badge: { label: string, variant?: "default"|"secondary"|"outline"|"destructive"|"success"|"warning" }
   - Metric: { label: string, value: string|number, format?: "number"|"percentage"|"duration"|"date", trend?: "up"|"down"|"stable", trendValue?: string }

3. List Components:
   - List: { items: [{ id, title, subtitle?, source?, sourceId?, url?, metadata? }], emptyMessage?: string }
   - Table: { columns: [{ key, label, width? }], rows: [Record<string, string|number|boolean>] }
   - Timeline: { items: [{ id, time, title, description?, icon?, status?: "past"|"current"|"upcoming" }], title?: string }

4. Interactive Components:
   - ActionButton: { label: string, action: { type, sourceId?, source?, url? }, variant?: "default"|"primary"|"secondary"|"ghost", icon?: "external"|"copy"|"clock", disabled?: boolean }
   - Alert: { type: "info"|"success"|"warning"|"error", title: string, message?: string }

5. Container:
   - GeneratedView: { title: string, description?: string }

RULES:
1. The root element MUST be a "GeneratedView" or "Stack" component
2. Use the EXACT component names and prop names listed above
3. Populate data from the provided brief context
4. Create meaningful, useful views that help the user understand their work
5. Use appropriate layouts (Grid for cards, Stack for lists, etc.)
6. Include action buttons where relevant (e.g., "View PR", "Draft Reply")
7. When data is empty or missing, show friendly "info" alerts like "No meetings scheduled for today" - NEVER say "unable to retrieve" or imply an error when data is simply empty

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "title": "View title describing what was generated",
  "description": "Optional brief description",
  "tree": {
    "type": "ComponentName",
    "props": { ... },
    "children": [ ... nested nodes ... ]
  }
}`;

export async function POST(request: Request) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { prompt, brief, model } = RequestSchema.parse(body);

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    // Build context from brief
    const briefContext = buildBriefContext(brief);

    // Call Claude to generate UI
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: modelMap[model],
      max_tokens: 4000,
      temperature: 0.5, // Slightly higher for creative views
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `USER REQUEST: "${prompt}"

BRIEF DATA:
${briefContext}

Generate a UI view that fulfills the user's request using ONLY components from the catalog. Return ONLY valid JSON.`,
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
      return NextResponse.json(
        { error: 'Failed to generate view - no valid response' },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', e);
      return NextResponse.json(
        { error: 'Failed to generate view - invalid JSON' },
        { status: 500 }
      );
    }

    // Validate the response structure
    const validated = ViewResponseSchema.safeParse(parsed);

    if (!validated.success) {
      console.error('Invalid view structure:', validated.error);
      // Try to use partial data
      if (parsed.tree) {
        return NextResponse.json({
          view: {
            id: `view-${Date.now()}`,
            title: parsed.title || 'Generated View',
            description: parsed.description,
            tree: parsed.tree,
            generatedAt: new Date().toISOString(),
            prompt,
          },
        });
      }
      return NextResponse.json(
        { error: 'Failed to generate view - invalid structure' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      view: {
        id: `view-${Date.now()}`,
        title: validated.data.title,
        description: validated.data.description,
        tree: validated.data.tree,
        generatedAt: new Date().toISOString(),
        prompt,
      },
    });

  } catch (error) {
    console.error('Error generating view:', error);
    return NextResponse.json(
      { error: 'Failed to generate view' },
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

  // Format items as JSON-like for Claude to parse
  const data: Record<string, any> = {};

  if (brief.prsToReview && brief.prsToReview.length > 0) {
    data.prsToReview = brief.prsToReview.map(pr => ({
      id: pr.sourceId,
      title: pr.title,
      summary: pr.summary,
      priority: pr.priority,
      url: pr.url,
      source: 'github',
    }));
  }

  if (brief.myPrsWaiting && brief.myPrsWaiting.length > 0) {
    data.myPrsWaiting = brief.myPrsWaiting.map(pr => ({
      id: pr.sourceId,
      title: pr.title,
      summary: pr.summary,
      priority: pr.priority,
      url: pr.url,
      source: 'github',
    }));
  }

  if (brief.emailsToActOn && brief.emailsToActOn.length > 0) {
    data.emailsToActOn = brief.emailsToActOn.map(email => ({
      id: email.sourceId,
      title: email.title,
      summary: email.summary,
      priority: email.priority,
      source: 'email',
    }));
  }

  if (brief.meetings && brief.meetings.length > 0) {
    data.meetings = brief.meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      time: meeting.time,
      attendees: meeting.attendees,
      prepNeeded: meeting.prepNeeded,
      url: meeting.url,
      source: 'calendar',
    }));
  }

  if (brief.jiraTasks && brief.jiraTasks.length > 0) {
    data.jiraTasks = brief.jiraTasks.map(task => ({
      id: task.sourceId,
      title: task.title,
      summary: task.summary,
      priority: task.priority,
      deadline: task.deadline,
      url: task.url,
      source: 'jira',
    }));
  }

  if (brief.alerts && brief.alerts.length > 0) {
    data.alerts = brief.alerts.map(alert => ({
      type: alert.type,
      title: alert.title,
      description: alert.description,
    }));
  }

  if (brief.topFocus && brief.topFocus.length > 0) {
    data.topFocus = brief.topFocus.map((item, i) => ({
      rank: item.rank || i + 1,
      title: item.title,
      reason: item.reason,
    }));
  }

  sections.push(JSON.stringify(data, null, 2));

  return sections.join('\n\n');
}
