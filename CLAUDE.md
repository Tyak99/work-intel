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
