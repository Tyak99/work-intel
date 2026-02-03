# Product Roadmap: Work Intel Pivot

> **This file is the source of truth for product direction.** Every Claude Code session should read this first to understand what we're building, why, and what's next. Update this file as milestones are completed.

## The Pivot (Decided Feb 2026)

### What We Were
A personal AI dashboard for individual engineers — aggregates GitHub, Jira, Gmail, Calendar into a daily brief. Problem: too much setup friction for individuals, not enough standalone value to justify connecting 5+ tools.

### What We're Becoming
A **team engineering intelligence tool** where one admin connects integrations and the whole team gets value. The entry point is dead simple: GitHub-only weekly team summary for engineering managers.

### Strategy: Start Narrow, Expand With Value

```
Phase 1: "Weekly Team Recap" (GitHub Only)
   One admin pastes a GitHub org token. Every Monday, each team member
   and the manager gets a summary of what shipped, what's stuck, what
   needs attention. Setup: 60 seconds.

Phase 2: "Standup Autopilot" (Add Jira/Linear)
   Auto-generates daily standup updates per developer.
   Manager gets sprint health view. Slack bot integration.

Phase 3: "Full Context" (Add Gmail/Calendar)
   Cross-tool intelligence. Meeting prep, email follow-ups,
   the full vision — but only after teams are hooked.
```

### Why This Wins
- **One person sets up, 10 people benefit** (eliminates individual setup friction)
- **The buyer (eng manager) has budget** and a real pain (visibility into team output)
- **The user (engineer) gets value with zero setup** (standup written for them)
- **We're not replacing Jira** — we're making Jira's data useful
- **Pricing: $8-15/seat/month** — easy expense approval for a 10-person team

---

## Phase 1: Weekly Team Recap (CURRENT)

### Status: ~70% COMPLETE — Core working, needs onboarding & email delivery

### Goal
An eng manager connects their GitHub org. Every team member gets a weekly summary. The manager gets a team-wide view. That's it. No other integrations.

### What Needs to Happen

#### 1. Data Model Changes
- [x] **Teams table**: id, name, slug, created_by (admin), created_at
- [x] **Team members table**: team_id, user_id, role (admin/member), github_username, joined_at
- [x] **Team integrations table**: team_id, provider (github/jira/linear), config (JSONB), connected_by
- [x] **Weekly reports table**: team_id, week_start, report_data (JSONB), generated_at
- [x] RLS enabled on all team tables
- [x] Existing personal dashboard tables untouched — both modes coexist

#### 2. GitHub Data Collection (Team-Level)
- [x] Fetch all PRs merged in the past week per team member
- [x] Fetch open PRs and their review status
- [x] Fetch PR review activity (who reviewed what)
- [x] Identify stuck PRs (open > 3 days, no reviews)
- [x] Identify blocked PRs (changes requested, no update)
- [x] Commit activity summary per person

#### 3. AI Summary Generation
- [x] Per-developer weekly summary: what they shipped, what's in flight
- [x] Team-level summary: overall velocity, blockers, attention needed
- [x] "Needs attention" flagging: stuck PRs, unreviewed PRs, scope creep indicators
- [x] Use existing Claude integration, adapt prompt for team context

#### 4. Team Management UI
- [x] Team creation flow (name, connect GitHub org)
- [x] Invite team members (email invite — requires existing user, see note below)
- [x] Team settings page (manage members, GitHub config)
- [x] Admin vs member permissions

#### 5. Report Delivery
- [x] Web dashboard: team view with per-person breakdown
- [ ] Email delivery: Monday morning summary email
- [ ] Individual view: "here's your week" for each developer

#### 6. Onboarding Flow
- [ ] Landing page / home showing teams list for authenticated users (not personal dashboard)
- [ ] "Create a team" UI accessible from home page
- [ ] Personal dashboard gated to `/personal` route, founder-email only
- [ ] Team-first routing for new users

### UI Vision — What the Product Looks Like When Phase 1 Is Done

The current app is a single-user personal dashboard. Phase 1 replaces that as the default experience with a team-oriented product. Here are the screens:

**Login / Signup**
- New users see "Create a team" or "Join a team" — not "connect your tools"
- Existing auth system, but the post-login destination changes from personal dashboard to team dashboard

**Team Dashboard (Manager View — the main screen)**
- Team name and week selector at the top
- Summary banner: "This week: 12 PRs merged, 3 stuck, 2 need review"
- "Needs attention" section at top: stuck PRs (no review in 3+ days), blocked PRs (changes requested, no update), unreviewed PRs assigned to team members
- Per-person breakdown cards below: each developer shows what they merged, what's open, their review activity. Click to expand details.
- "Generate Report" button (or auto-generated weekly)

**Individual View (Developer's own view)**
- "Your week" — what you shipped, what's in flight, what's waiting on you
- Your open PRs and their review status
- Simpler than the manager view — focused on your own work

**Team Settings (Admin only)**
- Manage members: invite by email, remove, set roles
- GitHub connection: org name, token, optional repo filter
- Future: Jira/Linear connections appear here in Phase 2

**Onboarding (First-time admin)**
- Step 1: Name your team
- Step 2: Connect GitHub (paste org token)
- Step 3: Invite team members (enter emails)
- Done — first report generates immediately as a demo

**`/personal` (Hidden, founder-only)**
- The current personal dashboard, unchanged
- Only accessible if logged-in user matches founder email
- Not linked from anywhere in the main navigation

### What We Keep From Current Codebase
- Supabase database (add new tables)
- Next.js app structure
- Claude AI integration (adapt prompts)
- GitHub service (`lib/services/github.ts` — extend for org-level)
- Auth system (extend for team context)
- shadcn/ui components

### What We Defer
- Jira/Linear integration (Phase 2)
- Gmail/Calendar integration (Phase 3)
- Daily briefs (Phase 2 — weekly first)
- Action agents / smart to-do (Phase 3)
- The "personal dashboard" mode (keep working but not the focus)

### What We Remove/Hide
- Multi-tool connection requirement for new users
- Individual-only flows on landing/onboarding
- Complexity that doesn't serve the team use case

### Personal Dashboard
The legacy personal dashboard (daily briefs, personal GitHub/Jira/Gmail/Calendar integrations) should be hidden from all users except the founder. Gate it behind a `/personal` route that only loads if the logged-in user's email matches the founder's email. New users should never see it — they land on the team product. This is not a feature flag system, just a simple email check.

---

## Phase 2: Standup Autopilot (FUTURE)

### Prerequisites
- Phase 1 complete with at least 3 teams using it

### Scope
- Add Jira/Linear as a second integration (optional)
- Daily standup generation per developer
- Slack bot that posts standups to a channel
- Sprint health dashboard for managers
- Move from weekly to daily cadence (optional per team)

---

## Phase 3: Full Context Intelligence (FUTURE)

### Prerequisites
- Phase 2 complete with proven daily engagement

### Scope
- Gmail/Calendar integration
- Meeting prep summaries
- Cross-tool correlation (this PR relates to that Jira ticket and that email thread)
- Action agents (draft replies, review suggestions)
- The full original vision, but for teams

---

## Architecture Decisions

### Multi-Tenancy Approach
Teams are the primary unit. Users belong to one or more teams. Each team has its own integrations and data. The existing single-user mode continues to work but isn't the primary flow.

### GitHub Token Strategy
For Phase 1, the team admin provides a GitHub PAT with org read access. This is simple but has limitations (token tied to one person). Future: GitHub App installation for proper org-level auth.

### Pricing Model (Planned)
- Free: 1 team, up to 5 members, weekly reports only
- Pro ($10/seat/month): Unlimited members, daily reports, Slack integration
- Not implementing billing in Phase 1 — get users first

---

## Session Handoff Notes

> **For future Claude sessions**: Update this section with what you accomplished and what's next. Delete old notes once they're no longer relevant.

### Latest Session: Feb 3, 2026
- **What happened**: Major implementation sprint by another agent. The core team product is now functional:
  - GitHub data collection service (`lib/services/team-github.ts`) — fetches PRs, reviews, commits, detects stuck/blocked PRs
  - AI summary generation (`lib/services/team-report.ts`) — per-developer and team-level summaries using Claude
  - Team dashboard UI (`app/team/[slug]/page.tsx`) — shows stats, AI summary, needs-attention alerts, per-person breakdowns
  - Team settings page (`app/team/[slug]/settings/page.tsx`) — GitHub connection, member management
  - 7 API endpoints for teams, members, integrations, and reports
  - Team auth helpers (`lib/services/team-auth.ts`) — role-based access control
- **What's DONE**: Sections 1-4 complete, Section 5 partial (web dashboard done, email not done)
- **What's REMAINING** (to complete Phase 1):
  1. **Onboarding/Navigation** — Update home page to show teams list instead of personal dashboard. Add "Create team" UI. Gate personal dashboard to `/personal` with founder-email check.
  2. **Email delivery** — Send weekly summaries every Monday morning (to manager + individual devs)
  3. **Individual developer view** — "Your week" page showing what they shipped/in-flight
- **Known limitations**:
  - Member invite requires user to already exist in DB (no email invite flow for new users yet)
  - Reports are manual-trigger only (no scheduled cron yet)
- **Open questions**: None blocking.

### Previous: Feb 2, 2026
- Product strategy session. Created roadmap. Applied database migrations for team tables.
