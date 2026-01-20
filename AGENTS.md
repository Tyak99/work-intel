# AI Work Dashboard

AI-powered work dashboard that integrates Gmail, Calendar, GitHub, Jira, and Claude AI to generate daily briefs.

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Anthropic Claude (multi-agent orchestration)
- **Database**: Supabase (PostgreSQL)

## Running the App

The app runs on **port 3004**. It's usually already running in dev sessions.

```bash
# Check if running
curl -s http://localhost:3004/api/tools/connect?userId=user-1

# Start if needed
PORT=3004 npm run dev
```

## Authentication

| Service | Auth Method | Config |
|---------|-------------|--------|
| GitHub | `GITHUB_TOKEN` env var | `.env.local` |
| Jira | `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env vars | `.env.local` |
| Gmail/Calendar | Nylas OAuth (grant stored in Supabase) | One-time browser OAuth |
| Claude | `ANTHROPIC_API_KEY` env var | `.env.local` |

## Testing the App

### Test API Endpoints

```bash
# Check all tool connections
curl -s "http://localhost:3004/api/tools/connect?userId=user-1" | jq

# Generate a brief (takes ~30-60s, involves AI agents)
curl -X POST http://localhost:3004/api/brief/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'

# Get latest brief
curl -s "http://localhost:3004/api/brief/latest?userId=user-1" | jq
```

### Browser Testing (OAuth flows)

If Nylas OAuth needs re-authorization, use the pre-authenticated Chrome:

```bash
npm run chrome:debug   # Start debug Chrome on port 9222
npm run chrome:status  # Check if running
npm run chrome:stop    # Stop debug Chrome
```

The debug Chrome persists sessions at `~/.chrome-debug-profile`.

## Key Directories

```
app/                    # Next.js pages and API routes
├── api/
│   ├── brief/         # Brief generation endpoints
│   ├── tools/         # Tool connection management
│   └── auth/nylas/    # OAuth flow
lib/
├── services/          # External API integrations
│   ├── github.ts      # GitHub API (PAT auth)
│   ├── jira.ts        # Jira API (Basic auth)
│   ├── gmail.ts       # Gmail via Nylas
│   ├── calendarData.ts # Calendar via Nylas
│   └── nylas.ts       # Nylas OAuth handling
├── agents/            # AI agent system
│   ├── coordinator.ts # Multi-agent orchestration
│   ├── executor.ts    # Claude API interaction
│   └── specialists/   # Domain-specific agents
└── store.ts           # Zustand state management
```

## Common Tasks

### After Making Code Changes

1. Check TypeScript compiles: `npx tsc --noEmit`
2. Test the affected endpoint with curl
3. For UI changes, verify at http://localhost:3004

### If Gmail/Calendar Stops Working

The Nylas OAuth grant may have expired. Re-authorize:
1. `npm run chrome:debug`
2. Navigate to http://localhost:3004
3. Click "Connect Gmail" and complete OAuth
4. Grant is stored in Supabase for future use
