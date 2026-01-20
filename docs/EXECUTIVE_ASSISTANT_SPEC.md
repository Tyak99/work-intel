# Executive Assistant Daily Brief - Technical Specification

## Overview

An AI-powered executive assistant that provides a smart, prioritized daily brief and actionable to-do list for software engineers.

## Architecture

### Design Principles

Following [Anthropic's guidance](https://www.anthropic.com/research/building-effective-agents):
> "Find the simplest solution possible, and only increase complexity when needed. For many applications, optimizing single LLM calls with retrieval and in-context examples is usually enough."

### Two-Phase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: DAILY BRIEF (Lightweight, Fast)                       │
│                                                                 │
│  1. Fetch data from APIs (no LLM)                              │
│  2. Pre-process: truncate, strip HTML, filter                  │
│  3. Single LLM call with ALL condensed context                 │
│  4. Structured output → UI                                      │
│                                                                 │
│  Output: Prioritized list with item IDs for Phase 2            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Prepare Action"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: ACTION AGENTS (On-Demand, Full Context)              │
│                                                                 │
│  - Email Agent: Fetches full email, drafts response            │
│  - PR Agent: Fetches full diff, prepares review                │
│  - Jira Agent: Fetches full context, suggests update           │
│                                                                 │
│  Output: Smart To-Do with pre-drafted actions                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Daily Brief

### Data Fetching (No LLM)

| Source | What to Fetch | Filters |
|--------|--------------|---------|
| **Gmail** | Recent emails | Last 24h, unread, max 15 |
| **Calendar** | Events | Today + tomorrow |
| **GitHub** | PRs | Assigned as reviewer OR created by me, open only |
| **Jira** | Tasks | Assigned to me, active sprint |

### Pre-Processing (No LLM)

```typescript
interface ProcessedEmail {
  id: string;
  from: string;
  subject: string;
  receivedAt: Date;
  snippet: string;           // First 100 chars
  bodyPreview: string;       // First 500 chars, HTML stripped
  isAutomated: boolean;      // Detected: noreply@, notification@, etc.
  automatedType?: string;    // 'sentry' | 'aws' | 'github' | 'marketing' | etc.
}

interface ProcessedPR {
  id: string;
  number: number;
  title: string;
  author: string;
  repo: string;
  createdAt: Date;
  reviewStatus: 'pending' | 'approved' | 'changes_requested';
  isMyPR: boolean;           // Did I create this?
  isReviewAssigned: boolean; // Am I assigned as reviewer?
  description: string;       // First 300 chars
  changedFiles: number;
  additions: number;
  deletions: number;
}

interface ProcessedCalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  description: string;       // First 300 chars
  isRecurring: boolean;
  meetingLink?: string;
}

interface ProcessedJiraTask {
  id: string;
  key: string;               // e.g., "PROJ-123"
  title: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate?: Date;
  description: string;       // First 300 chars
  labels: string[];
}
```

### Single LLM Call

**Model**: `claude-sonnet-4-20250514` (fast, smart enough)

**Prompt Strategy**:
- Use [prompt caching](https://www.anthropic.com/news/prompt-caching) for system prompt (90% cost reduction on subsequent calls)
- Use Zod schemas for structured output validation
- Target: ~10-15K tokens input, ~2K tokens output

**System Prompt** (cacheable):
```
You are an executive assistant for a senior software engineer. Your job is to analyze their work data and provide a smart, prioritized daily brief.

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

OUTPUT FORMAT:
Return a JSON object matching the BriefOutput schema.
```

**Zod Schema**:
```typescript
import { z } from 'zod';

const BriefItemSchema = z.object({
  id: z.string(),
  source: z.enum(['email', 'calendar', 'github', 'jira']),
  sourceId: z.string(),
  title: z.string(),
  summary: z.string().max(200),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  actionNeeded: z.boolean(),
  actionType: z.enum(['respond', 'review', 'attend', 'complete', 'investigate']).optional(),
  deadline: z.string().optional(),  // "today", "tomorrow", "this week"
  context: z.string().max(300).optional(),  // Why this is important
});

const MeetingItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),  // "10:00 AM - 11:00 AM"
  attendees: z.array(z.string()),
  prepNeeded: z.string().optional(),  // What to prepare
  relatedItems: z.array(z.string()).optional(),  // IDs of related PRs/Jira tasks
});

const BriefOutputSchema = z.object({
  generatedAt: z.string(),

  topFocus: z.array(z.object({
    rank: z.number(),
    title: z.string(),
    reason: z.string(),
    relatedItemId: z.string(),
  })).max(3),

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

  summary: z.string().max(500),  // Natural language summary
});
```

### Implementation with Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const client = new Anthropic();

async function generateBrief(data: ProcessedData): Promise<BriefOutput> {
  const systemPrompt = `...`; // Cached system prompt

  const userPrompt = `
Here is my work data for today:

## Calendar (${data.calendar.length} events)
${JSON.stringify(data.calendar, null, 2)}

## Emails (${data.emails.length} messages)
${JSON.stringify(data.emails, null, 2)}

## GitHub PRs (${data.prs.length} pull requests)
${JSON.stringify(data.prs, null, 2)}

## Jira Tasks (${data.jira.length} tasks)
${JSON.stringify(data.jira, null, 2)}

Analyze this data and provide my daily brief.
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }  // Cache for 5 min
      }
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Parse and validate with Zod
  const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  return BriefOutputSchema.parse(JSON.parse(jsonMatch[0]));
}
```

---

## Phase 2: Action Agents (Future)

### Smart To-Do List

When user clicks "Prepare Action" on a brief item:

```typescript
interface SmartTodoItem {
  id: string;
  briefItemId: string;      // Links back to brief item
  type: 'email_reply' | 'pr_review' | 'jira_update' | 'meeting_prep';
  title: string;

  // Pre-drafted action
  draftContent?: string;    // Draft email reply, review comments, etc.

  // Action buttons
  actions: Array<{
    label: string;          // "Send Reply", "Submit Review", "Mark Done"
    type: 'execute' | 'edit' | 'skip';
    payload: any;           // Data needed to execute
  }>;

  status: 'pending' | 'approved' | 'skipped' | 'executed';
}
```

### Email Reply Agent

```typescript
async function prepareEmailReply(emailId: string): Promise<SmartTodoItem> {
  // 1. Fetch FULL email (not truncated)
  const fullEmail = await fetchFullEmail(emailId);

  // 2. Generate reply draft
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are drafting an email reply for a senior software engineer.
Keep it professional, concise, and actionable. Match the tone of the original.`,
    messages: [{
      role: 'user',
      content: `Draft a reply to this email:\n\n${JSON.stringify(fullEmail)}`
    }],
  });

  return {
    id: generateId(),
    briefItemId: emailId,
    type: 'email_reply',
    title: `Reply to: ${fullEmail.subject}`,
    draftContent: response.content[0].text,
    actions: [
      { label: 'Send Reply', type: 'execute', payload: { emailId, draft: response.content[0].text } },
      { label: 'Edit First', type: 'edit', payload: { draft: response.content[0].text } },
      { label: 'Skip', type: 'skip', payload: {} },
    ],
    status: 'pending',
  };
}
```

### PR Review Agent

```typescript
async function preparePRReview(prId: string): Promise<SmartTodoItem> {
  // 1. Fetch full PR with diff
  const fullPR = await fetchFullPR(prId);

  // 2. Generate review comments
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    thinking: { type: 'enabled', budget_tokens: 1000 },  // Extended thinking for code review
    system: `You are a senior software engineer reviewing a pull request.
Provide constructive, specific feedback. Flag any bugs, security issues, or improvements.`,
    messages: [{
      role: 'user',
      content: `Review this PR:\n\nTitle: ${fullPR.title}\nDescription: ${fullPR.description}\n\nDiff:\n${fullPR.diff}`
    }],
  });

  return {
    id: generateId(),
    briefItemId: prId,
    type: 'pr_review',
    title: `Review PR: ${fullPR.title}`,
    draftContent: response.content.find(b => b.type === 'text')?.text,
    actions: [
      { label: 'Approve', type: 'execute', payload: { prId, action: 'approve' } },
      { label: 'Request Changes', type: 'execute', payload: { prId, action: 'request_changes' } },
      { label: 'Add Comments Only', type: 'execute', payload: { prId, action: 'comment' } },
      { label: 'Skip', type: 'skip', payload: {} },
    ],
    status: 'pending',
  };
}
```

---

## UI Specification

### Daily Brief View

```
┌─────────────────────────────────────────────────────────────────┐
│  Daily Brief                              Generated: 9:00 AM    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  🎯 TODAY'S FOCUS                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Review PR #456 - Auth refactor (blocking 2 people)   │   │
│  │ 2. Respond to Sarah's deployment question               │   │
│  │ 3. Complete JIRA-123 before sprint end                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📅 MEETINGS TODAY                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 10:00 AM  Standup (15 min)                              │   │
│  │ 2:00 PM   Design Review - Prep: Review PR #456          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  👀 PRs TO REVIEW (2)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PR #456 - Auth refactor           @john    2 days ago   │   │
│  │ +120 -45 | Blocking: @sarah, @mike         [Prepare →]  │   │
│  │──────────────────────────────────────────────────────── │   │
│  │ PR #489 - Fix pagination          @sarah   4 hours ago  │   │
│  │ +12 -3 | Quick fix                         [Prepare →]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⏳ MY PRs WAITING (1)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PR #478 - Add caching             Waiting: @john (3d)   │   │
│  │                                            [Nudge →]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📧 EMAILS TO ACT ON (3)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Sarah Chen - Deployment question           [Prepare →]  │   │
│  │ "Can you help with the staging deploy..."               │   │
│  │──────────────────────────────────────────────────────── │   │
│  │ 🔴 Sentry - Production Error (Critical)   [View →]      │   │
│  │ Payment processing failing for customer...              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📋 JIRA TASKS (4)                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PROJ-123  Add user auth      In Progress   Due: Today   │   │
│  │ PROJ-124  Fix memory leak    To Do         Due: Fri     │   │
│  │ PROJ-125  Update docs        To Do         No due date  │   │
│  │ PROJ-126  Review security    Blocked       Waiting: QA  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Smart To-Do Modal (Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│  Smart To-Do: Reply to Sarah Chen                    [× Close]  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Original Email:                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ From: Sarah Chen <sarah@company.com>                    │   │
│  │ Subject: Deployment question                            │   │
│  │                                                         │   │
│  │ Hey, can you help with the staging deployment? I'm      │   │
│  │ getting an error when running the deploy script...      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  AI-Drafted Reply:                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Hi Sarah,                                               │   │
│  │                                                         │   │
│  │ Happy to help! That error usually means the staging     │   │
│  │ credentials need to be refreshed. Try running:          │   │
│  │                                                         │   │
│  │   ./scripts/refresh-staging-creds.sh                    │   │
│  │                                                         │   │
│  │ If that doesn't work, let me know and I can take a      │   │
│  │ closer look at the logs.                                │   │
│  │                                                         │   │
│  │ Best,                                                   │   │
│  │ [Your name]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  ✓ Send      │  │  ✏️ Edit     │  │  ✗ Skip      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1A: Simplified Brief (MVP)
- [ ] Refactor data fetching to use filters and truncation
- [ ] Create single `generateBrief()` function with Zod schemas
- [ ] Update UI to match new brief structure
- [ ] Add prompt caching for system prompt
- [ ] Remove multi-agent coordinator code

### Phase 1B: Polish Brief
- [ ] Smart email categorization (automated vs personal)
- [ ] PR blocking detection (who's waiting)
- [ ] Calendar prep suggestions
- [ ] Better Jira integration (sprint context)

### Phase 2: Smart To-Do List
- [ ] "Prepare Action" button on brief items
- [ ] Email reply agent with draft generation
- [ ] PR review agent with diff analysis
- [ ] Jira update agent
- [ ] Approval/Edit/Skip workflow

### Phase 3: Execution
- [ ] Send email replies via Gmail API
- [ ] Submit PR reviews via GitHub API
- [ ] Update Jira tasks via Jira API
- [ ] Audit log of AI actions

---

## Cost Estimates

### Phase 1 (Daily Brief)

| Component | Tokens | Cost (per brief) |
|-----------|--------|------------------|
| System prompt (cached) | ~2K | $0.0006 (read) |
| User data | ~10K | $0.03 |
| Output | ~2K | $0.03 |
| **Total** | ~14K | **~$0.06** |

With prompt caching: ~$0.03-0.04 per brief

### Phase 2 (Action Agents)

| Action | Tokens | Cost |
|--------|--------|------|
| Email reply | ~5K | $0.02 |
| PR review | ~20K | $0.08 |
| Jira update | ~3K | $0.01 |

---

## Files to Modify

1. `lib/services/brief.ts` - Main brief generation
2. `lib/services/gmailData.ts` - Add truncation/filtering
3. `lib/services/github.ts` - PR filtering by role
4. `lib/types.ts` - New brief types
5. `components/dashboard/brief-section.tsx` - New UI
6. Remove: `lib/agents/*` (multi-agent code)
