export interface Brief {
  id: string;
  generatedAt: Date;
  sections: BriefSection[];
  overallInsights?: OverallInsights;
  topFocus?: BriefFocusItem[];
  meetings?: MeetingItem[];
  prsToReview?: BriefListItem[];
  myPrsWaiting?: BriefListItem[];
  emailsToActOn?: BriefListItem[];
  jiraTasks?: BriefListItem[];
  alerts?: BriefAlert[];
  summary?: string;
}

export interface BriefSection {
  id: string;
  type: 'critical' | 'meetings' | 'reviews' | 'emails' | 'progress' | 'risks' | 'observations' | 'focus_time';
  title: string;
  items: BriefItem[];
  sectionInsights?: string;
}

export interface BriefItem {
  title: string;
  description: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
  sourceId?: string;
  url?: string;
  correlations?: Correlation[];
  blockingImpact?: string;
  deadline?: string;
  effort?: 'quick' | 'medium' | 'large';
  aiInsights?: string;
}

export interface BriefFocusItem {
  rank: number;
  title: string;
  reason: string;
  relatedItemId: string;
}

export interface BriefListItem {
  id: string;
  source: 'email' | 'calendar' | 'github' | 'jira';
  sourceId: string;
  title: string;
  summary: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionNeeded: boolean;
  actionType?: 'respond' | 'review' | 'attend' | 'complete' | 'investigate';
  deadline?: string;
  context?: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  time: string;
  attendees: string[];
  prepNeeded?: string;
  relatedItems?: string[];
}

export interface BriefAlert {
  type: 'outage' | 'production_error' | 'deadline' | 'blocker';
  title: string;
  description: string;
  sourceId: string;
}

export interface Correlation {
  type: 'explicit' | 'semantic' | 'temporal';
  relatedId: string;
  relatedSource: string;
  confidence: number;
  reason: string;
}

export interface OverallInsights {
  hiddenTasksFound: number;
  criticalCorrelations: string[];
  workPatterns: string[];
  recommendations: string[];
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'jira' | 'github' | 'gmail' | 'email' | 'calendar' | 'manual' | 'ai-discovered';
  sourceId?: string;
  url?: string;
  dueDate?: Date;
  createdAt: Date;
  correlations?: Correlation[];
  blockingImpact?: string;
  deadline?: string;
  effort?: 'quick' | 'medium' | 'large';
  aiInsights?: string;
}

export interface ToolStatus {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: Date;
  error?: string;
}

export interface DashboardState {
  brief: Brief | null;
  todos: Todo[];
  toolStatus: Record<string, ToolStatus>;
  isGeneratingBrief: boolean;
}

// Smart To-Do Action Types
export interface SmartTodoAction {
  label: string;
  type: 'copy' | 'edit' | 'skip' | 'regenerate';
  payload?: Record<string, any>;
}

// Legacy SmartTodoItem for backward compatibility with prepare-action API
export interface SmartTodoItem {
  id: string;
  briefItemId: string;
  type: 'email_reply' | 'pr_nudge' | 'meeting_prep';
  title: string;
  originalContent?: Record<string, any>;
  draftContent?: string;
  alternativeDrafts?: string[];
  actions: SmartTodoAction[];
  status: 'preparing' | 'ready' | 'copied' | 'error';
  error?: string;
}

// New SmartTodo interface - central place for AI-actionable items
export type SmartTodoType = 'manual' | 'ai_email_reply' | 'ai_pr_nudge' | 'ai_meeting_prep';
export type SmartTodoStatus = 'pending' | 'preparing' | 'ready' | 'done';

export interface SmartTodo {
  id: string;
  title: string;
  type: SmartTodoType;
  source?: 'github' | 'gmail' | 'calendar' | 'manual';
  sourceId?: string;
  briefItemId?: string;
  status: SmartTodoStatus;
  draftContent?: string;
  originalContext?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  url?: string;
}
