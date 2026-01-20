# Test App Skill

Use this skill to validate that the work dashboard app is working correctly.

## App Overview

This is an AI-powered work dashboard that integrates:
- **Gmail/Calendar** via Nylas OAuth (read-only)
- **GitHub** via Personal Access Token
- **Jira** via Basic Auth (email + API token)
- **Claude AI** for generating daily briefs

## Authentication Architecture

| Service | Auth Method | Config Location |
|---------|-------------|-----------------|
| GitHub | `GITHUB_TOKEN` env var | `.env.local` |
| Jira | `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env vars | `.env.local` |
| Gmail/Calendar | Nylas OAuth grant stored in Supabase | `nylas_grants` table |
| Claude | `ANTHROPIC_API_KEY` env var | `.env.local` |
| Nylas | `NYLAS_CLIENT_ID`, `NYLAS_API_KEY` env vars | `.env.local` |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` env vars | `.env.local` |

## Pre-Testing Checklist

### 1. Check Environment Variables
```bash
# Verify required env vars exist (don't print values)
grep -E "^(GITHUB_TOKEN|JIRA_URL|JIRA_EMAIL|JIRA_API_TOKEN|ANTHROPIC_API_KEY|NYLAS_CLIENT_ID|NYLAS_API_KEY|SUPABASE_URL|SUPABASE_ANON_KEY)=" .env.local | cut -d= -f1
```

Expected output should list all 9 variables.

### 2. Check Nylas Grant Exists
The Gmail/Calendar integration requires a Nylas OAuth grant. Check if one exists:
```bash
# Query Supabase for existing grant (requires app to be running or use psql)
curl -s "${SUPABASE_URL}/rest/v1/nylas_grants?user_id=eq.user-1" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
```

If empty `[]`, user needs to complete OAuth flow once via browser.

## Testing Commands

### Check if App is Running
```bash
curl -s http://localhost:3004/api/tools/status > /dev/null && echo "App running" || echo "App not running"
```

### Start the App (only if not already running)
The app is usually already running in the Claude Code session. Only start if needed:
```bash
PORT=3004 npm run dev
```

### Test All Tool Connections
```bash
curl -s "http://localhost:3004/api/tools/connect?userId=user-1" | jq
```

This returns status for all connected tools (GitHub, Jira, Gmail/Calendar).

### Generate a Brief
```bash
curl -X POST http://localhost:3004/api/brief/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'
```

### Get Latest Brief
```bash
curl -s "http://localhost:3004/api/brief/latest?userId=user-1" | jq
```

## Browser Testing (When OAuth Needed)

If Nylas OAuth needs to be completed, use the pre-authenticated Chrome:

### 1. Start Debug Chrome
```bash
npm run chrome:debug
```
This launches Chrome with a persistent profile at `~/.chrome-debug-profile`.

### 2. Sign In (One Time)
In the debug Chrome window, sign into Google (Gmail account).

### 3. Complete OAuth Flow
Navigate to the app and click "Connect Gmail" - the OAuth will use your signed-in Google session.

### 4. Verify Grant Stored
After OAuth callback, the grant is stored in Supabase. Future tests won't need browser.

### Stop Debug Chrome
```bash
npm run chrome:stop
```

## Using Playwright MCP for Browser Testing

The Playwright MCP is configured to connect to the debug Chrome:
```
npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9222
```

Before using Playwright tools, ensure debug Chrome is running:
```bash
npm run chrome:status
```

### Example: Navigate and Screenshot
```
Use mcp__playwright__browser_navigate to go to http://localhost:3004
Use mcp__playwright__browser_snapshot to see the page state
```

## Key Files

- `lib/services/github.ts` - GitHub API integration
- `lib/services/jira.ts` - Jira API integration
- `lib/services/gmail.ts` - Gmail via Nylas
- `lib/services/calendarData.ts` - Calendar via Nylas
- `lib/services/nylas.ts` - Nylas OAuth handling
- `lib/agents/coordinator.ts` - Multi-agent orchestration
- `app/api/brief/generate/route.ts` - Brief generation endpoint

## Troubleshooting

### "NYLAS_API_KEY is not configured"
Check `.env.local` has the Nylas credentials.

### "No grant found" for Gmail
User needs to complete OAuth flow once. Use browser testing approach above.

### GitHub/Jira "Failed to fetch"
Check the respective tokens in `.env.local` are valid and not expired.

### App won't start
```bash
npm install  # Ensure dependencies installed
npm run build  # Check for TypeScript errors
```
