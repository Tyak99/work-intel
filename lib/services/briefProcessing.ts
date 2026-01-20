import { GmailDataForBrief } from './gmailData';
import { CalendarDataForBrief } from './calendarData';

export interface ToolData {
  jira?: any;
  github?: any;
  gmail?: GmailDataForBrief | null;
  calendar?: CalendarDataForBrief | null;
}

export interface ProcessedEmail {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  bodyPreview: string;
  isAutomated: boolean;
  automatedType?: string;
}

export interface ProcessedPR {
  id: string;
  number: number;
  title: string;
  author: string;
  repo: string;
  createdAt: string;
  reviewStatus: 'pending' | 'approved' | 'changes_requested';
  isMyPR: boolean;
  isReviewAssigned: boolean;
  description: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export interface ProcessedCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description: string;
  isRecurring: boolean;
  meetingLink?: string;
}

export interface ProcessedJiraTask {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate?: string;
  description: string;
  labels: string[];
}

const MAX_EMAILS = 15;
const MAX_PREVIEW_CHARS = 500;
const MAX_SNIPPET_CHARS = 100;
const MAX_PR_DESCRIPTION_CHARS = 300;
const MAX_EVENT_DESCRIPTION_CHARS = 300;
const MAX_JIRA_DESCRIPTION_CHARS = 300;

const AUTOMATED_SENDERS = [
  'noreply',
  'no-reply',
  'donotreply',
  'notifications',
  'notification',
  'mailer-daemon'
];

const AUTOMATED_TYPE_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: 'sentry', pattern: /sentry/i },
  { type: 'aws', pattern: /\baws\b|amazon/i },
  { type: 'github', pattern: /github/i },
  { type: 'jira', pattern: /jira|atlassian/i },
  { type: 'calendar', pattern: /calendar|invite/i },
  { type: 'marketing', pattern: /newsletter|marketing|promo|sale/i }
];

export function buildCondensedBriefContext(toolData: ToolData) {
  return {
    emails: processEmails(toolData.gmail ?? null),
    prs: processPullRequests(toolData.github ?? null),
    calendarEvents: processCalendarEvents(toolData.calendar ?? null),
    jiraTasks: processJiraTasks(toolData.jira ?? null),
    generatedAt: new Date().toISOString()
  };
}

function processEmails(gmailData: GmailDataForBrief | null): ProcessedEmail[] {
  if (!gmailData) return [];

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const combined = [
    ...gmailData.unreadEmails,
    ...gmailData.recentEmails
  ];

  const seen = new Set<string>();
  const deduped = combined.filter(email => {
    if (seen.has(email.id)) return false;
    seen.add(email.id);
    return true;
  });

  const recentUnread = deduped.filter(email =>
    email.unread && email.date && new Date(email.date).getTime() >= last24h
  );

  return recentUnread.slice(0, MAX_EMAILS).map(email => {
    const subject = email.subject || '(No Subject)';
    const bodyPreviewSource = email.body || email.snippet || '';
    const bodyPreview = truncate(cleanHtml(bodyPreviewSource), MAX_PREVIEW_CHARS);
    const snippet = truncate(email.snippet || bodyPreview, MAX_SNIPPET_CHARS);
    const automation = detectAutomation(email.from, subject);

    return {
      id: email.id,
      from: email.from,
      subject,
      receivedAt: new Date(email.date || Date.now()).toISOString(),
      snippet,
      bodyPreview,
      isAutomated: automation.isAutomated,
      automatedType: automation.automatedType
    };
  });
}

function processPullRequests(githubData: any | null): ProcessedPR[] {
  if (!githubData) return [];

  const currentUser = githubData.currentUser?.login;
  const pullRequests = githubData.pullRequests ?? [];
  const reviewRequests = githubData.reviewRequests ?? [];

  const prs = [
    ...reviewRequests.map((pr: any) => ({
      ...pr,
      _isReviewAssigned: true
    })),
    ...pullRequests.map((pr: any) => ({
      ...pr,
      _isReviewAssigned: false
    }))
  ];

  const seen = new Set<string>();
  const deduped = prs.filter(pr => {
    const key = `${pr.id}-${pr.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.map(pr => {
    const description = truncate(cleanHtml(pr.body || ''), MAX_PR_DESCRIPTION_CHARS);
    const author = pr.user?.login || 'unknown';
    const repo = pr.repository?.full_name || pr.repository?.name || 'unknown';

    return {
      id: String(pr.id),
      number: pr.number,
      title: pr.title || '(No Title)',
      author,
      repo,
      createdAt: new Date(pr.created_at || Date.now()).toISOString(),
      reviewStatus: 'pending',
      isMyPR: currentUser ? author === currentUser : false,
      isReviewAssigned: pr._isReviewAssigned || false,
      description,
      changedFiles: pr.changed_files || 0,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0
    };
  });
}

function processCalendarEvents(calendarData: CalendarDataForBrief | null): ProcessedCalendarEvent[] {
  if (!calendarData) return [];

  const events = [
    ...(calendarData.todayEvents ?? []),
    ...(calendarData.tomorrowEvents ?? [])
  ];

  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).map(event => ({
    id: event.id,
    title: event.title || '(No Title)',
    startTime: new Date(event.startTime).toISOString(),
    endTime: new Date(event.endTime).toISOString(),
    attendees: (event.attendees || []).map((attendee: any) => attendee.email || attendee.name).filter(Boolean),
    description: truncate(cleanHtml(event.description || ''), MAX_EVENT_DESCRIPTION_CHARS),
    isRecurring: !!event.recurring,
    meetingLink: event.conferenceData?.url || event.htmlLink
  }));
}

function processJiraTasks(jiraData: any | null): ProcessedJiraTask[] {
  if (!jiraData) return [];

  const assignedIssues = jiraData.assignedIssues ?? [];

  return assignedIssues.map((issue: any) => {
    const descriptionText = extractJiraText(issue.description);
    return {
      id: issue.id,
      key: issue.key,
      title: issue.summary || '(No Title)',
      status: issue.status || 'Unknown',
      priority: issue.priority || 'Medium',
      assignee: issue.assignee || 'Unassigned',
      dueDate: issue.duedate ? new Date(issue.duedate).toISOString() : undefined,
      description: truncate(cleanHtml(descriptionText), MAX_JIRA_DESCRIPTION_CHARS),
      labels: issue.labels || []
    };
  });
}

function detectAutomation(from: string, subject: string) {
  const combined = `${from} ${subject}`.toLowerCase();
  const isAutomated = AUTOMATED_SENDERS.some(sender => combined.includes(sender));
  const automatedType = AUTOMATED_TYPE_PATTERNS.find(({ pattern }) => pattern.test(combined))?.type;
  return { isAutomated, automatedType };
}

function cleanHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return value.slice(0, max - 3).trimEnd() + '...';
}

function extractJiraText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(extractJiraText).join(' ');
  }
  if (value.text) return value.text;
  if (value.content) return extractJiraText(value.content);
  return '';
}
