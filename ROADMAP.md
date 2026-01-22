# Work Intel Roadmap

Future features and ideas to implement.

---

## Google Drive Integration

**Status:** Idea

Connect Google Drive folders as context sources for briefs.

**Use cases:**
- Meeting transcripts folder - auto-ingest transcripts after meetings
- Weekly notes folder - extract task context and commitments
- Shared team docs - surface relevant information

**Implementation notes:**
- Add Drive to Nylas scopes or use Google Drive API directly
- Let users configure watched folders
- Index new/updated files and extract relevant content
- Feed into brief generation context

---

## Jira Board Selector UI

**Status:** Idea

Let users pick their Jira board from a dropdown in settings instead of relying on `openSprints()` JQL.

**Implementation notes:**
- Fetch boards via `/rest/agile/1.0/board`
- Store selected board ID in user preferences (Supabase)
- Use board-specific sprint queries for more precise filtering
- Fall back to `openSprints()` if no board selected

---

## Weekly Goals System

**Status:** Idea

Define weekly goals and have the system track progress toward them.

**Concept:**
- Users set 1-3 weekly goals each Monday
- Daily priorities and top focus revolve around these goals
- Progress tracked automatically from completed tasks, PRs, Jira updates
- End-of-week summary showing goal completion

**Components:**
- Goals CRUD (title, description, success criteria, due date)
- Progress tracking agent that correlates work items to goals
- Brief section showing goal progress
- Weekly retrospective generation

---

## Background Progress Agent

**Status:** Idea

An agent that runs periodically (hourly?) to detect changes and update progress.

**Triggers:**
- New meeting transcript added to Drive
- PR merged or reviewed
- Jira status changed
- Email thread resolved

**Actions:**
- Update goal progress automatically
- Surface new action items from transcripts
- Detect blockers or risks
- Send notifications for important changes

**Implementation notes:**
- Could be a Vercel cron job or background worker
- Needs state tracking to detect "new" vs "seen" items
- Should generate incremental updates, not full brief regeneration
- Consider push notifications or Slack integration for alerts

---

## Adding New Ideas

Add new sections below using this template:

```markdown
## Feature Name

**Status:** Idea | In Progress | Done

Brief description.

**Use cases:**
- ...

**Implementation notes:**
- ...
```
