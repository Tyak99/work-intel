export interface Brief {
  id: string;
  generatedAt: Date;
  sections: BriefSection[];
  overallInsights?: OverallInsights;
}

export interface BriefSection {
  id: string;
  type: 'critical' | 'meetings' | 'reviews' | 'emails' | 'progress' | 'risks' | 'observations';
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
  source: 'jira' | 'github' | 'email' | 'calendar' | 'manual' | 'ai-discovered';
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