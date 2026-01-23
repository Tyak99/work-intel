// Generative UI Types
// Using Zod 4 aliased import for component schemas

import { z } from 'zod4';

// === Action Types ===
export type ActionType =
  | 'draft_email_reply'
  | 'draft_pr_nudge'
  | 'draft_meeting_prep'
  | 'open_url'
  | 'copy_to_clipboard'
  | 'dismiss'
  | 'snooze';

export interface ActionPayload {
  type: ActionType;
  sourceId?: string;
  source?: 'github' | 'email' | 'calendar' | 'jira';
  url?: string;
  content?: string;
  duration?: number; // for snooze, in minutes
}

// === Suggestion Types ===
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type SourceType = 'github' | 'email' | 'calendar' | 'jira';

export interface Suggestion {
  id: string;
  title: string;
  subtitle?: string;
  reason: string; // WHY the AI recommends this
  urgency: UrgencyLevel;
  source: SourceType;
  sourceId: string;
  actions: SuggestionAction[];
  dismissedAt?: string;
  snoozedUntil?: string;
}

export interface SuggestionAction {
  label: string;
  action: ActionPayload;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  icon?: string;
  confirmRequired?: boolean;
}

// === Generated View Types ===
export type ComponentType =
  // Layout
  | 'Stack'
  | 'Grid'
  | 'Card'
  // Data Display
  | 'Text'
  | 'Badge'
  | 'Metric'
  | 'List'
  | 'Table'
  | 'Timeline'
  // Interactive
  | 'ActionButton'
  | 'Alert'
  // Containers
  | 'GeneratedView'
  | 'SuggestionCard';

export interface UINode {
  type: ComponentType;
  props: Record<string, any>;
  children?: UINode[];
}

export interface GeneratedViewData {
  id: string;
  title: string;
  description?: string;
  tree: UINode;
  generatedAt: string;
  prompt?: string;
}

// === State Types ===
export interface GenerativeUIState {
  suggestions: Suggestion[];
  dismissedIds: Set<string>;
  snoozedIds: Map<string, number>; // id -> timestamp when snooze expires
  isLoadingSuggestions: boolean;
  generatedView: GeneratedViewData | null;
  isGeneratingView: boolean;
  promptInput: string;
  error: string | null;
}

// === API Response Types ===
export interface SuggestionsResponse {
  suggestions: Suggestion[];
  generatedAt: string;
}

export interface GenerateViewResponse {
  view: GeneratedViewData;
  error?: string;
}

// === Streaming Types ===
export interface StreamChunk {
  type: 'partial' | 'complete' | 'error';
  data: any;
  index?: number;
}
