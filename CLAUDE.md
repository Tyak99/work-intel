# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work Intel is pivoting from a personal AI dashboard to a **team engineering intelligence tool**.

**Read `PRODUCT_ROADMAP.md` at the start of every session** — it contains the full product strategy, current phase, what's been done, and what's next. Update its "Session Handoff Notes" section at the end of every session.

### Current Direction (Feb 2026 Pivot)
- **Phase 1 (NOW)**: Weekly Team Recap — GitHub only, one admin connects, whole team gets value
- **Phase 2 (FUTURE)**: Standup Autopilot — add Jira/Linear, daily cadence, Slack bot
- **Phase 3 (FUTURE)**: Full Context — add Gmail/Calendar, action agents, cross-tool intelligence

### Legacy Context
The codebase was originally built as a personal tool that synthesizes GitHub, Jira, Gmail, and Google Calendar into daily briefs. This code still works and serves as the foundation, but new development should focus on the team-first direction described in `PRODUCT_ROADMAP.md`.

## Development Commands

```bash
# Development server (always runs on port 3004)
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Chrome debugging for OAuth flows
npm run chrome:debug       # Start headless Chrome on port 9222
npm run chrome:debug-status # Check if debug Chrome is running
npm run chrome:stop        # Stop debug Chrome

# Vercel CLI (authenticated)
vercel env ls              # List environment variables
vercel env pull            # Pull env vars to .env.local
vercel logs <url>          # View runtime logs for a deployment
vercel inspect <url>       # Inspect a deployment
vercel --prod              # Deploy to production
```

## Deployment

The app is deployed on Vercel. The project is linked as `nasri/work-intel` with the domain `work-intel.vercel.app`. The Vercel CLI is authenticated and available for debugging deployments, checking logs, and managing environment variables.

## Testing Requirements

**CRITICAL**: Always test the application locally after making code changes:

1. Start the dev server: `npm run dev`
2. Verify the app loads without errors in the browser
3. Test any modified functionality manually
4. Check browser console and server logs for errors

Do not consider a task complete until local testing confirms it works.

## Testing API Endpoints

No test framework - use curl for manual testing. Note: Most endpoints now require session authentication (cookie-based).

```bash
# For authenticated endpoints, first login via browser, then use cookies
# Or test via the browser directly

# Check auth status
curl -s "http://localhost:3000/api/auth/me" --cookie "work_intel_session=<token>" | jq

# Generate a brief (requires auth)
curl -X POST http://localhost:3000/api/brief/generate \
  -H "Content-Type: application/json" \
  --cookie "work_intel_session=<token>"

# Get latest brief (requires auth)
curl -s "http://localhost:3000/api/brief/latest" --cookie "work_intel_session=<token>" | jq
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand
- **Backend**: Next.js API Routes, Claude 3.5 Sonnet (Anthropic SDK)
- **Integrations**: GitHub (@octokit/rest), Jira (REST API), Gmail/Calendar (Nylas SDK)
- **Database**: Supabase (PostgreSQL) for OAuth grant storage

### Key Directories
```
app/
├── api/                    # API Routes
│   ├── brief/              # Personal brief endpoints (legacy)
│   ├── tasks/route.ts      # Todo CRUD
│   ├── auth/               # OAuth flow handlers
│   └── teams/              # Team API endpoints (NEW)
│       ├── route.ts                    # POST create, GET list teams
│       └── [teamId]/
│           ├── route.ts                # GET team details
│           ├── members/route.ts        # GET/POST members
│           ├── members/[memberId]/     # PATCH/DELETE member
│           ├── integrations/github/    # POST/DELETE GitHub connection
│           └── reports/                # generate/, latest/
├── team/[slug]/            # Team dashboard pages (NEW)
│   ├── page.tsx            # Main team weekly report view
│   └── settings/page.tsx   # Team settings (GitHub, members)
└── page.tsx                # Home — currently personal dashboard (needs update)

lib/
├── services/
│   ├── brief.ts            # Personal brief generation (legacy)
│   ├── claude.ts           # Claude API wrapper with Zod schemas
│   ├── github.ts           # Personal GitHub integration (legacy)
│   ├── team-auth.ts        # Team membership & admin checks (NEW)
│   ├── team-github.ts      # Team GitHub data collection (NEW)
│   └── team-report.ts      # Team weekly report generation (NEW)
├── store.ts                # Zustand state (personal)
├── team-store.ts           # Zustand state for teams (NEW)
├── supabase.ts             # DB client + types (includes team types)
└── cache.ts                # In-memory caching layer

components/
├── dashboard/              # Personal dashboard components (legacy)
├── team/                   # Team UI components (NEW)
│   ├── summary-banner.tsx  # Stats cards + AI summary
│   ├── needs-attention.tsx # Stuck/blocked PR alerts
│   ├── member-card.tsx     # Per-developer summary card
│   ├── github-connect-form.tsx
│   ├── member-management.tsx
│   └── report-generate-button.tsx
└── ui/                     # shadcn/ui component library
```

### Two-Phase Brief Generation

1. **Data Collection (Fast)**: Parallel API calls to GitHub, Jira, Gmail, Calendar with 15-minute caching
2. **AI Processing (Single Call)**: Claude processes condensed context using Zod schemas for structured output
3. **Action Agents (On-Demand)**: Email replies, PR nudges, meeting prep drafted by specialized agents

### Caching Strategy
- Tool responses: 15 minutes TTL
- Daily briefs: 1 hour per day
- Tool status: 5 minutes TTL
- Auto-invalidation on connection changes

## Authentication

| Service | Auth Method | Config Location |
|---------|-------------|-----------------|
| Claude | `ANTHROPIC_API_KEY` env var | `.env.local` |
| GitHub | `GITHUB_TOKEN` env var (PAT) | `.env.local` |
| Jira | `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | `.env.local` |
| Gmail/Calendar | Nylas OAuth (grant stored in Supabase) | Browser OAuth flow |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `.env.local` |

## Supabase Database Access

Claude Code has direct access to the Supabase database via MCP (Model Context Protocol). The project ID is `dbfanoyvtufdyimlqmos`.

### Available MCP Tools

Use these tools for database operations instead of writing migration code manually:

- `mcp__supabase__list_tables` - List all tables in a schema
- `mcp__supabase__list_migrations` - View applied migrations
- `mcp__supabase__apply_migration` - Apply DDL changes (CREATE, ALTER, DROP)
- `mcp__supabase__execute_sql` - Run SELECT queries (read-only data operations)
- `mcp__supabase__get_logs` - Debug issues with logs
- `mcp__supabase__get_advisors` - Check for security/performance issues

### Database Schema

```
users                    # User accounts (created on OAuth)
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── display_name (TEXT)
├── created_at, last_login_at (TIMESTAMPTZ)

sessions                 # Cookie-based auth sessions
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── token (TEXT, UNIQUE)
├── expires_at, created_at (TIMESTAMPTZ)

briefs                   # Daily AI briefs (JSONB, 30-day retention)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── brief_date (DATE)
├── content (JSONB)
├── generated_at (TIMESTAMPTZ)
├── UNIQUE(user_id, brief_date)

tasks                    # Persistent todos
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── title, description (TEXT)
├── completed (BOOLEAN)
├── priority (critical|high|medium|low)
├── source, source_id, url (TEXT)
├── due_date, created_at, updated_at (TIMESTAMPTZ)

nylas_grants             # OAuth grants for Gmail/Calendar
├── grant_id (TEXT, PK)
├── user_id (TEXT) - legacy
├── user_uuid (UUID, FK → users) - new auth system
├── email, provider (TEXT)
├── scopes (TEXT[])
├── created_at, last_sync (TIMESTAMPTZ)

# --- Team tables (Phase 1 pivot) ---

teams                    # Team organizational units
├── id (UUID, PK)
├── name (TEXT)
├── slug (TEXT, UNIQUE)
├── created_by (UUID, FK → users)
├── created_at, updated_at (TIMESTAMPTZ)

team_members             # Users belonging to teams
├── id (UUID, PK)
├── team_id (UUID, FK → teams, CASCADE)
├── user_id (UUID, FK → users, CASCADE)
├── role (TEXT: admin|member)
├── github_username (TEXT, nullable)
├── joined_at (TIMESTAMPTZ)
├── UNIQUE(team_id, user_id)

team_integrations        # Per-team tool connections (GitHub, Jira, Linear)
├── id (UUID, PK)
├── team_id (UUID, FK → teams, CASCADE)
├── provider (TEXT: github|jira|linear)
├── config (JSONB) — e.g. { org, token, repos_filter }
├── connected_by (UUID, FK → users)
├── connected_at (TIMESTAMPTZ)
├── last_sync_at (TIMESTAMPTZ, nullable)
├── UNIQUE(team_id, provider)

weekly_reports           # Generated team weekly summaries
├── id (UUID, PK)
├── team_id (UUID, FK → teams, CASCADE)
├── week_start (DATE)
├── report_data (JSONB)
├── generated_at (TIMESTAMPTZ)
├── UNIQUE(team_id, week_start)
```

### When to Use MCP vs Code

- **Use MCP tools**: Schema changes, migrations, debugging queries, checking data
- **Use lib/supabase.ts**: Application code that reads/writes data at runtime

### Database Agent

For complex database operations, use the database subagent:

```
Task tool with subagent_type="database"
```

The database agent is specialized for:
- Schema modifications and migrations
- Data inspection and debugging
- Security and performance checks
- Complex SQL operations

Example: "Use the database agent to add an index on the tasks table for better query performance"

## UI Guidelines

- Use shadcn/ui components and Tailwind CSS
- Icons from lucide-react only
- Add `"use client"` directive when using React hooks (useState, useEffect)
- Avoid extra packages unless absolutely necessary

## Multi-Theme System

The app supports multiple themes with different visual styles and labels.

### Theme Architecture

| File | Purpose |
|------|---------|
| `lib/theme-config.ts` | Theme definitions (labels, properties) |
| `components/theme-provider.tsx` | React context for theme state |
| `app/globals.css` | CSS variables and theme-specific overrides |

### Current Themes

- **Dark Future** (`future`): Cyberpunk aesthetic with neon colors, glow effects, animations
- **Original** (`original`): Clean, professional light theme

### Adding New Features (Theme-Aware)

To ensure features work across all themes:

1. **Use CSS variables** instead of hardcoded colors:
   - ✅ `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`
   - ❌ `bg-black/80`, `text-slate-300`, `bg-[#1a1a2e]`

2. **Use theme labels** for user-facing text:
   ```tsx
   const { t } = useTheme();
   return <h1>{t('briefTitle')}</h1>; // "Daily Brief" or "Mission Objectives"
   ```

3. **Check theme properties** for conditional rendering:
   ```tsx
   const { hasAnimations, hasGlowEffects, isDark } = useTheme();
   ```

### Adding a New Theme

1. Add theme config to `lib/theme-config.ts`:
   ```typescript
   newTheme: {
     id: 'newTheme',
     name: 'Display Name',
     isDark: true/false,
     hasGlowEffects: true/false,
     hasAnimations: true/false,
     fontStyle: 'clean' | 'futuristic' | 'playful',
     labels: { /* all ThemeLabels keys */ }
   }
   ```

2. Add CSS variables in `app/globals.css`:
   ```css
   .theme-newTheme {
     --background: 0 0% 100%;
     --foreground: 222 47% 11%;
     /* ... other variables */
   }
   ```

3. Add CSS overrides for any hardcoded colors (if components use them)

### Known Limitation

Some components use hardcoded Tailwind colors (e.g., `bg-black/80`, neon colors) which require CSS overrides in `globals.css` for each theme. For better scalability, prefer CSS variables.

## Browser Testing with Claude in Chrome

**CRITICAL**: When using Claude in Chrome MCP tools for browser testing:

- **DO NOT use screenshot actions** - they crash the browser
- Use `read_page`, `find`, and `javascript_tool` for inspection instead
- Use `computer` action with `ref` parameters for clicking (not coordinates when possible)
- If the extension becomes unresponsive, the user needs to refresh the browser

## Plan Mode Behavior

**CRITICAL**: When in plan mode and asked to plan a feature or change, you MUST conduct a thorough interview using `AskUserQuestion` before writing any plan. Do not assume you understand the requirements—dig deep.

### Interview Requirements

Ask probing, non-obvious questions across these dimensions:

**Technical Implementation**
- What existing patterns in the codebase should this align with or deliberately deviate from?
- Are there performance constraints (render frequency, data volume, latency budgets)?
- Should this integrate with or replace existing functionality?
- What's the failure mode—graceful degradation, error boundaries, retry logic?
- Are there race conditions or state synchronization concerns to consider?

**UI/UX**
- What's the user's mental model here—how do they think about this workflow?
- Should feedback be immediate, optimistic, or wait for confirmation?
- What's the information hierarchy—what matters most visually?
- How should this behave on different viewport sizes or input methods?
- What happens in edge states (empty, loading, partial data, error)?

**Scope & Boundaries**
- What's explicitly out of scope that I might assume is included?
- Is this a stepping stone to something larger, or a standalone feature?
- Are there adjacent features this should NOT affect?
- What's the minimum viable version vs. the ideal version?

**Concerns & Tradeoffs**
- What would make you mass this feature a failure even if it "works"?
- Are there security, privacy, or data integrity concerns specific to this?
- What maintenance burden are you willing to accept?
- If I have to choose between X and Y, what's your preference?

### Interview Style

- Ask 2-4 focused questions at a time, not a wall of questions
- Build on previous answers—go deeper on areas of uncertainty
- Surface implicit assumptions: "I'm assuming X—is that correct?"
- Identify the "why" behind requests to suggest better alternatives
- Don't ask questions with obvious answers from the codebase—do your research first
