// Component Catalog - Zod schemas defining allowed UI components
// This constrains what Claude can generate to safe, known components

import { z } from 'zod';

// === Base Schemas ===
const UrgencySchema = z.enum(['low', 'medium', 'high', 'critical']);
const SourceSchema = z.enum(['github', 'email', 'calendar', 'jira']);
const VariantSchema = z.enum(['default', 'primary', 'secondary', 'ghost', 'destructive']);
const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

// === Action Schemas ===
const ActionTypeSchema = z.enum([
  'draft_email_reply',
  'draft_pr_nudge',
  'draft_meeting_prep',
  'open_url',
  'copy_to_clipboard',
  'dismiss',
  'snooze'
]);

export const ActionPayloadSchema = z.object({
  type: ActionTypeSchema,
  sourceId: z.string().optional(),
  source: SourceSchema.optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  duration: z.number().optional(),
});

// === Suggestion Action Schema ===
export const SuggestionActionSchema = z.object({
  label: z.string().max(30),
  action: ActionPayloadSchema,
  variant: VariantSchema.optional(),
  icon: z.string().optional(),
  confirmRequired: z.boolean().optional(),
});

// === Suggestion Schema ===
export const SuggestionSchema = z.object({
  id: z.string(),
  title: z.string().max(100),
  subtitle: z.string().max(150).optional(),
  reason: z.string().max(200), // WHY - this is key for transparency
  urgency: UrgencySchema,
  source: SourceSchema,
  sourceId: z.string(),
  actions: z.array(SuggestionActionSchema).max(4),
});

// === UI Component Schemas ===

// Text component
export const TextPropsSchema = z.object({
  content: z.string(),
  variant: z.enum(['body', 'heading', 'subheading', 'caption', 'code']).optional(),
  color: z.enum(['default', 'muted', 'primary', 'success', 'warning', 'error']).optional(),
});

// Badge component
export const BadgePropsSchema = z.object({
  label: z.string().max(30),
  variant: z.enum(['default', 'secondary', 'outline', 'destructive', 'success', 'warning']).optional(),
});

// Metric component - for displaying numbers with context
export const MetricPropsSchema = z.object({
  label: z.string().max(50),
  value: z.union([z.string(), z.number()]),
  format: z.enum(['number', 'percentage', 'duration', 'date']).optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  trendValue: z.string().optional(),
});

// Action Button component
export const ActionButtonPropsSchema = z.object({
  label: z.string().max(30),
  action: ActionPayloadSchema,
  variant: VariantSchema.optional(),
  icon: z.string().optional(),
  confirmRequired: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

// Alert component
export const AlertPropsSchema = z.object({
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().max(100),
  message: z.string().max(300).optional(),
});

// Card component - for displaying items
export const CardPropsSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(300).optional(),
  source: SourceSchema.optional(),
  sourceId: z.string().optional(),
  priority: PrioritySchema.optional(),
  url: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Stack layout
export const StackPropsSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']).optional(),
  spacing: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justify: z.enum(['start', 'center', 'end', 'between', 'around']).optional(),
});

// Grid layout
export const GridPropsSchema = z.object({
  columns: z.number().min(1).max(6).optional(),
  gap: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
});

// List component
export const ListPropsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    source: SourceSchema.optional(),
    sourceId: z.string().optional(),
    url: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  })),
  emptyMessage: z.string().optional(),
});

// Table component
export const TablePropsSchema = z.object({
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    width: z.string().optional(),
  })),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean()]))),
});

// Timeline component
export const TimelinePropsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    time: z.string(),
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(['past', 'current', 'upcoming']).optional(),
  })),
  title: z.string().optional(),
});

// Suggestion Card (for action bar)
export const SuggestionCardPropsSchema = z.object({
  suggestion: SuggestionSchema,
});

// Generated View container
export const GeneratedViewPropsSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(300).optional(),
});

// === Component Type Union ===
export const ComponentTypeSchema = z.enum([
  'Stack',
  'Grid',
  'Card',
  'Text',
  'Badge',
  'Metric',
  'List',
  'Table',
  'Timeline',
  'ActionButton',
  'Alert',
  'GeneratedView',
  'SuggestionCard',
]);

// === UI Node Schema (recursive) ===
export const UINodeSchema: z.ZodType<{
  type: z.infer<typeof ComponentTypeSchema>;
  props: Record<string, any>;
  children?: any[];
}> = z.object({
  type: ComponentTypeSchema,
  props: z.record(z.any()),
  children: z.lazy(() => z.array(UINodeSchema)).optional(),
});

// === Response Schemas ===
export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema).max(5),
  generatedAt: z.string(),
});

export const GeneratedViewResponseSchema = z.object({
  view: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tree: UINodeSchema,
    generatedAt: z.string(),
    prompt: z.string().optional(),
  }),
  error: z.string().optional(),
});

// === Type Exports ===
export type ActionPayload = z.infer<typeof ActionPayloadSchema>;
export type SuggestionAction = z.infer<typeof SuggestionActionSchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;
export type UINode = z.infer<typeof UINodeSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
