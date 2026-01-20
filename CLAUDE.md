# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Work Intel is an AI-powered work intelligence dashboard that synthesizes information from GitHub, Jira, Gmail, and Google Calendar to generate actionable daily briefs with smart AI-assisted actions.

## Development Commands

```bash
# Development server (runs on port 3000 by default, 3004 in production sessions)
npm run dev
PORT=3004 npm run dev  # Explicit port

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
```

## Testing API Endpoints

No test framework - use curl for manual testing:

```bash
# Check tool connections
curl -s "http://localhost:3004/api/tools/connect?userId=user-1" | jq

# Generate a brief (takes 30-60s, involves AI agents)
curl -X POST http://localhost:3004/api/brief/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'

# Get latest brief
curl -s "http://localhost:3004/api/brief/latest?userId=user-1" | jq
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand
- **Backend**: Next.js API Routes, Claude 3.5 Sonnet (Anthropic SDK)
- **Integrations**: GitHub (@octokit/rest), Jira (REST API), Gmail/Calendar (Nylas SDK)
- **Database**: Supabase (PostgreSQL) for OAuth grant storage

### Key Directories
```
app/api/                    # API Routes
├── brief/                  # Brief generation endpoints
│   ├── generate/route.ts   # Main brief generation
│   ├── latest/route.ts     # Fetch cached brief
│   └── prepare-action/route.ts # AI-drafted actions
├── tasks/route.ts          # Todo CRUD
└── auth/nylas/             # OAuth flow handlers

lib/
├── agents/                 # Multi-agent orchestration
│   ├── coordinator.ts      # Master orchestrator
│   ├── executor.ts         # Claude API interaction
│   └── specialists/        # Domain-specific agents (github, jira, email, calendar)
├── services/               # External API integrations
│   ├── brief.ts            # Brief generation orchestration
│   ├── claude.ts           # Claude API wrapper with Zod schemas
│   ├── github.ts, jira.ts  # Tool integrations
│   ├── nylas.ts            # Nylas OAuth & API wrapper
│   └── tasks.ts            # Todo persistence
├── store.ts                # Zustand state management
└── cache.ts                # In-memory caching layer

components/
├── dashboard/              # Main dashboard components
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

## UI Guidelines

- Use shadcn/ui components and Tailwind CSS
- Icons from lucide-react only
- Add `"use client"` directive when using React hooks (useState, useEffect)
- Avoid extra packages unless absolutely necessary

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
