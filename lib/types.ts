export interface Brief {
  id: string;
  generatedAt: Date;
  sections: BriefSection[];
}

export interface BriefSection {
  id: string;
  type: 'critical' | 'meetings' | 'reviews' | 'emails' | 'progress' | 'risks' | 'observations';
  title: string;
  items: BriefItem[];
}

export interface BriefItem {
  title: string;
  description: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
  sourceId?: string;
  url?: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'jira' | 'github' | 'email' | 'calendar' | 'manual';
  sourceId?: string;
  url?: string;
  dueDate?: Date;
  createdAt: Date;
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