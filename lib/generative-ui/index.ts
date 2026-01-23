// Generative UI - Main exports
// This is the public API for the generative UI system

// Types
export type {
  ActionType,
  ActionPayload,
  UrgencyLevel,
  SourceType,
  Suggestion,
  SuggestionAction,
  ComponentType,
  UINode,
  GeneratedViewData,
  GenerativeUIState,
  SuggestionsResponse,
  GenerateViewResponse,
  StreamChunk,
} from './types';

// Zod schemas (from catalog)
export {
  ActionPayloadSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  TextPropsSchema,
  BadgePropsSchema,
  MetricPropsSchema,
  ActionButtonPropsSchema,
  AlertPropsSchema,
  CardPropsSchema,
  StackPropsSchema,
  GridPropsSchema,
  ListPropsSchema,
  TablePropsSchema,
  TimelinePropsSchema,
  SuggestionCardPropsSchema,
  GeneratedViewPropsSchema,
  ComponentTypeSchema,
  UINodeSchema,
  SuggestionsResponseSchema,
  GeneratedViewResponseSchema,
} from './catalog';

// Registry and rendering
export {
  componentRegistry,
  renderUITree,
  type ActionHandler,
} from './registry';

// Providers
export {
  DataProvider,
  ActionProvider,
  GenerativeUIContextProvider,
  useDataContext,
  useActionContext,
} from './providers';

// Hooks
export { useUIStream, type StreamState } from './hooks/useUIStream';
export { useProactiveSuggestions } from './hooks/useProactiveSuggestions';
export { useGenerativeUI, presetPrompts } from './hooks/useGenerativeUI';
