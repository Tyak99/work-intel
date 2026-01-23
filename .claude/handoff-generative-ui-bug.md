# Handoff: Generative UI Bug Fix

## Current State
The Generative UI feature has been implemented with a side-by-side layout on `/ai-assistant` page. However, there's a runtime error when clicking "Generate" to create a custom view.

## The Bug
**Error:** `useActionContext must be used within an ActionProvider`

**Source:** `lib/generative-ui/providers.tsx:58` → called from `components/generative-ui/GeneratedView.tsx:34`

**Root Cause:**
The `app/ai-assistant/page.tsx` was refactored to remove the `GenerativeUIProvider` wrapper (which contained `ActionProvider` and `DataProvider`). However, the `GeneratedView` component still uses `useActionContext()` hook which requires being inside an `ActionProvider`.

## Files Involved

### Key Files to Fix:
1. **`app/ai-assistant/page.tsx`** - The main AI Assistant page (side-by-side layout)
2. **`components/generative-ui/GeneratedView.tsx`** - Renders AI-generated UI trees, uses `useActionContext`
3. **`lib/generative-ui/providers.tsx`** - Contains `ActionProvider`, `DataProvider`, `GenerativeUIContextProvider`

### Supporting Files (for reference):
- `lib/generative-ui/registry.tsx` - Component registry and `renderUITree` function
- `lib/generative-ui/types.ts` - TypeScript types
- `lib/generative-ui/catalog.ts` - Zod schemas for UI components
- `app/api/generative-ui/generate/route.ts` - API endpoint for generating views
- `app/api/generative-ui/suggestions/route.ts` - API endpoint for proactive suggestions

## Fix Options

### Option 1: Wrap GeneratedView with ActionProvider (Recommended)
In `app/ai-assistant/page.tsx`, wrap the section that renders `GeneratedView` with the necessary providers:

```tsx
import { ActionProvider, DataProvider } from '@/lib/generative-ui/providers';

// In the JSX where GeneratedView is rendered:
<DataProvider brief={brief}>
  <ActionProvider>
    <GeneratedView view={view} />
  </ActionProvider>
</DataProvider>
```

### Option 2: Make GeneratedView not require ActionContext
Modify `GeneratedView.tsx` to accept an `onAction` prop directly instead of using `useActionContext`. This makes it more portable.

```tsx
// Change from:
const { onAction } = useActionContext();

// To:
interface GeneratedViewProps {
  view: any;
  onAction?: (action: ActionPayload) => void;
}

// Then use a default handler if onAction isn't provided
const handleAction = onAction || ((action) => {
  if (action.type === 'open_url' && action.url) {
    window.open(action.url, '_blank');
  }
});
```

## Testing Steps

1. Start the dev server: `npm run dev` (runs on port 3004)
2. Navigate to `http://localhost:3004`
3. Login if needed (OAuth with Gmail)
4. If no brief exists, click "Generate Brief" and wait
5. Click the floating "AI Suggestions Beta" button to go to `/ai-assistant`
6. On the AI Assistant page:
   - Try typing a prompt like "Show my PRs as cards" and click Generate
   - Try clicking a quick prompt button like "Critical items summary"
7. Verify the generated view appears on the RIGHT side without errors
8. Verify the Proactive Suggestions on the LEFT side still work (dismiss, snooze)

## Additional Context

### Page Layout (as designed):
```
┌─────────────────────────────────────────────────────────────────┐
│  [Back to Dashboard]   AI Suggestions [Beta]                    │
├───────────────────────────────┬─────────────────────────────────┤
│  LEFT SIDE                    │  RIGHT SIDE                     │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐    │
│  │ AI-Powered Assistant    │  │  │ Generated View          │    │
│  │ Brief info              │  │  │ (views appear here)     │    │
│  └─────────────────────────┘  │  │                         │    │
│  ┌─────────────────────────┐  │  │ [Generated cards/lists] │    │
│  │ Ask anything...         │  │  │                         │    │
│  │ [input] [Generate]      │  │  └─────────────────────────┘    │
│  │ Quick prompts: [...]    │  │                                 │
│  └─────────────────────────┘  │                                 │
│  ┌─────────────────────────┐  │                                 │
│  │ Proactive Suggestions   │  │                                 │
│  │ (4 items with actions)  │  │                                 │
│  └─────────────────────────┘  │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

### How Generation Works:
1. User enters prompt or clicks quick prompt
2. `handlePromptSubmit()` in page.tsx calls `/api/generative-ui/generate`
3. API uses Claude to generate a JSON UI tree matching the Zod schema
4. Response contains `{ view: { id, title, description, tree, prompt } }`
5. View is added to `generatedViews` state array
6. `GeneratedView` component renders the `tree` using `renderUITree` from registry

### The renderUITree Function:
Located in `lib/generative-ui/registry.tsx`, it recursively renders UI nodes:
- Takes a `UINode` (type + props + children)
- Looks up component in `componentRegistry`
- Passes `onAction` handler from context to each component
- Returns React elements

### Available UI Components (in catalog):
- Layout: Stack, Grid
- Content: Card, Text, Badge, Metric
- Lists: List, Table, Timeline
- Interactive: ActionButton, Alert
- Containers: GeneratedView, SuggestionCard

## Quick Commands
```bash
# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Check for the specific error file
cat components/generative-ui/GeneratedView.tsx
cat lib/generative-ui/providers.tsx
cat app/ai-assistant/page.tsx
```

## Success Criteria
1. No runtime errors when clicking Generate
2. Generated views render correctly on the right side
3. Action buttons in generated views work (e.g., "Open" buttons open URLs)
4. Multiple generated views can stack
5. "Clear all" button removes all views
6. Proactive suggestions on left side still work
