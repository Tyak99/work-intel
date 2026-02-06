# GitHub OAuth App — Implementation Plan

> Replaces manual PAT entry (ACTION_PLAN.md §3.1) with one-click GitHub App installation flow.

---

## Decision: GitHub App vs. OAuth App

**Use a GitHub App**, not a plain OAuth App. Reasons:

| Aspect | OAuth App | GitHub App |
|--------|-----------|------------|
| Token tied to | A person's account | The organization (installation) |
| Token lifetime | Permanent (PAT-like) | 1 hour (auto-refreshable) |
| Permissions | Broad OAuth scopes | Granular per-resource permissions |
| User experience | "Authorize" button | "Install" button in org settings |
| Org visibility | Hidden | Visible in org's "Installed Apps" |
| Rate limits | 5,000/hr per user | 5,000/hr per installation (scales better) |

---

## Architecture Overview

```
Admin clicks "Connect GitHub"
  → GET /api/auth/github/connect?teamId={id}
    → Redirect to github.com/apps/{app}/installations/new
      → User installs app on their org
        → GitHub redirects to /api/auth/github/callback?installation_id=X&setup_action=install
          → Exchange installation_id for installation access token
          → Fetch org name from installation
          → Store in team_integrations (same table, same provider='github')
            → Redirect to /team/{slug}/settings?github_connected=true
```

This mirrors the existing Atlassian OAuth flow in `lib/services/atlassian-oauth.ts`.

---

## Required GitHub App Permissions

**Repository permissions (read-only):**
- `Contents` — read commits
- `Pull requests` — read PRs, reviews, comments
- `Metadata` — read repo names, visibility (auto-granted)

**Organization permissions (read-only):**
- `Members` — read org members (for username matching)

**No webhook subscription needed** — we poll on demand during report generation.

---

## Implementation Steps

### Step 1: Create GitHub App (Manual, One-Time Setup)

Register at https://github.com/settings/apps/new:

- **App name**: `Work Intel`
- **Homepage URL**: `https://work-intel.vercel.app`
- **Callback URL**: `https://work-intel.vercel.app/api/auth/github/callback`
- **Setup URL (optional)**: `https://work-intel.vercel.app/api/auth/github/callback` (redirect after install)
- **Redirect on update**: checked
- **Webhook**: **Inactive** (no webhooks needed)
- **Permissions**: As listed above (all read-only)
- **Where can this app be installed?**: Any account

Record these values for `.env`:
- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY` (base64-encoded PEM for generating installation tokens)

### Step 2: Environment Variables

**File: `.env.example`** — Add:
```env
# GitHub App (OAuth for team GitHub integration)
# Create a GitHub App at https://github.com/settings/apps/new
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.abc123
GITHUB_APP_CLIENT_SECRET=your_client_secret
# Base64-encoded PEM private key: cat private-key.pem | base64 -w 0
GITHUB_APP_PRIVATE_KEY=base64_encoded_private_key
```

### Step 3: OAuth State Table (Database Migration)

Create `github_oauth_states` table — identical pattern to `atlassian_oauth_states`:

```sql
CREATE TABLE github_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_github_oauth_states_token ON github_oauth_states(state_token);
CREATE INDEX idx_github_oauth_states_expires ON github_oauth_states(expires_at);
```

RLS: Disabled (accessed only via service role key from API routes, same as `atlassian_oauth_states`).

### Step 4: GitHub OAuth Service

**New file: `lib/services/github-oauth.ts`**

Mirrors `lib/services/atlassian-oauth.ts` structure. Key functions:

```typescript
// --- Config helpers ---
function getAppId(): string              // GITHUB_APP_ID
function getClientId(): string           // GITHUB_APP_CLIENT_ID
function getClientSecret(): string       // GITHUB_APP_CLIENT_SECRET
function getPrivateKey(): string         // Base64-decode GITHUB_APP_PRIVATE_KEY
function getRedirectUri(): string        // GITHUB_OAUTH_REDIRECT_URI or default

// --- State management (CSRF) ---
async function createOAuthState(teamId: string, userId: string): Promise<string>
// Insert into github_oauth_states with 10-min expiry, return state token

async function verifyOAuthState(stateToken: string): Promise<{ teamId: string; userId: string } | null>
// Verify + consume (delete) the state token, check expiry

// --- Auth URL ---
function buildGitHubInstallUrl(stateToken: string): string
// Returns: https://github.com/apps/{app-slug}/installations/new?state={stateToken}

// --- Token management ---
async function getInstallationAccessToken(installationId: number): Promise<{ token: string; expiresAt: Date }>
// Uses App JWT (signed with private key) → POST /app/installations/{id}/access_tokens
// Returns short-lived token (1hr)

async function getInstallationOrg(installationId: number, token: string): Promise<{ org: string; orgId: number }>
// GET /installation → extract account.login (the org name)

// --- Integration persistence ---
async function saveGitHubIntegration(teamId: string, config: GitHubOAuthConfig, connectedBy: string): Promise<void>
// Upsert into team_integrations with provider='github'
// Encrypt the installation_id (not really secret, but consistent)

async function getValidGitHubToken(teamId: string): Promise<{ token: string; org: string } | null>
// Read team_integrations → get installation_id → generate fresh access token
// This is the key difference: tokens are generated on-the-fly, never stored long-term

async function revokeGitHubIntegration(teamId: string): Promise<void>
// Delete from team_integrations
// Optionally: DELETE /app/installations/{id} to uninstall (with user confirmation)
```

**New type in `lib/supabase.ts`:**
```typescript
export interface GitHubOAuthConfig {
  installation_id: number;
  org: string;
  org_id: number;
  connected_email: string;
  auth_type: 'github_app';  // Distinguishes from legacy PAT ('pat')
}
```

**Key difference from Atlassian**: GitHub App tokens are generated on-demand from the `installation_id` + private key. No refresh token needed. The `installation_id` is the permanent credential.

### Step 5: API Routes

#### `app/api/auth/github/connect/route.ts` (New)
```
GET /api/auth/github/connect?teamId={teamId}
```
- Require authenticated user + team admin
- Create OAuth state token (CSRF)
- Redirect to GitHub App install URL with state

#### `app/api/auth/github/callback/route.ts` (New)
```
GET /api/auth/github/callback?installation_id={id}&setup_action=install&state={state}
```
- Verify state token (CSRF protection)
- Use `installation_id` to generate an access token
- Fetch org info from the installation
- Save to `team_integrations` with `auth_type: 'github_app'`
- Redirect to `/team/{slug}/settings?github_connected=true`

Handle edge cases:
- `setup_action=request` → user requested install but isn't org admin (show message)
- Missing `installation_id` → error redirect
- Invalid/expired state → error redirect

#### `app/api/auth/github/disconnect/route.ts` (New)
```
POST /api/auth/github/disconnect
Body: { teamId }
```
- Require team admin
- Delete from `team_integrations`
- Audit log

### Step 6: Update `team-github.ts` (Data Fetching)

**File: `lib/services/team-github.ts`** — Modify `fetchTeamGitHubData()`:

Currently (line 119):
```typescript
const { org, encrypted_token } = integration.config as { org: string; encrypted_token: string };
const token = decrypt(encrypted_token);
const octokit = new Octokit({ auth: token });
```

Change to support both auth types:
```typescript
const config = integration.config;
let token: string;
let org: string;

if (config.auth_type === 'github_app') {
  // GitHub App: generate fresh installation token
  const result = await getValidGitHubToken(teamId);
  if (!result) throw new Error('Failed to get GitHub App token');
  token = result.token;
  org = result.org;
} else {
  // Legacy PAT: decrypt stored token
  org = config.org;
  token = decrypt(config.encrypted_token);
}

const octokit = new Octokit({ auth: token });
```

This is the **backward compatibility layer** — existing PAT teams continue to work.

### Step 7: Update UI Components

#### `components/team/github-connect-form.tsx` — Modify

Replace the PAT form with a one-click OAuth button:

**Connected state** (when `auth_type === 'github_app'`):
```
[GitHub icon] GitHub Connected via GitHub App
Organization: {org}
[Disconnect]
```

**Connected state** (when legacy PAT, no `auth_type` field):
```
[GitHub icon] GitHub Connected (Personal Token)
Organization: {org}
[⚠️ Upgrade to GitHub App — more secure, no token rotation needed]
[Disconnect]
```

**Disconnected state** (admin):
```
[GitHub icon] Connect GitHub
We'll read your org's PRs, commits, and reviews to generate weekly reports.
[Install GitHub App]  ← single button, redirects to /api/auth/github/connect
```

- "Install GitHub App" button → navigates to `/api/auth/github/connect?teamId={teamId}`
- No text inputs needed
- Keep a small "Use Personal Access Token instead" link for fallback (collapses to show old form)

#### `components/team/onboarding-wizard.tsx` — Modify Step 0

Replace the PAT form (lines 142-193) with:

```
Connect GitHub
We'll read your org's PRs, commits, and reviews to generate weekly reports.

[Install GitHub App]  ← primary CTA

Or use a Personal Access Token →  ← small text link, toggles old form
```

The flow:
1. Admin clicks "Install GitHub App"
2. Redirected to GitHub (new tab or same tab)
3. Installs app on their org
4. Redirected back to callback, which redirects to `/team/{slug}/onboarding?step=0&github_connected=true`
5. Onboarding wizard reads the query param, marks step as complete

### Step 8: Handle the Redirect Back to Onboarding

The callback route needs to know whether the user came from **settings** or **onboarding**.

Add a `redirect_to` field to the state token:

```typescript
// In github_oauth_states table (add column):
redirect_to TEXT  // 'onboarding' | 'settings' | null

// In createOAuthState:
createOAuthState(teamId, userId, redirectTo?: 'onboarding' | 'settings')

// In callback:
if (stateData.redirectTo === 'onboarding') {
  redirect(`/team/${slug}/onboarding?step=0&github_connected=true`);
} else {
  redirect(`/team/${slug}/settings?github_connected=true`);
}
```

### Step 9: Update `.env.example`

Add the GitHub App variables (see Step 2).

### Step 10: PAT Deprecation Banner

For teams still using PAT auth, show an info banner on the settings page:

```
ℹ️ Your GitHub connection uses a Personal Access Token.
   Upgrade to the GitHub App for better security — tokens auto-rotate
   and aren't tied to a single person's account.
   [Upgrade to GitHub App]
```

The "Upgrade" button triggers the same OAuth flow. On successful callback, the old PAT config is overwritten by the new GitHub App config (same `team_integrations` row, upsert on `team_id, provider`).

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `lib/services/github-oauth.ts` | **Create** | OAuth service (state, tokens, persistence) |
| `app/api/auth/github/connect/route.ts` | **Create** | Initiate OAuth redirect |
| `app/api/auth/github/callback/route.ts` | **Create** | Handle callback from GitHub |
| `app/api/auth/github/disconnect/route.ts` | **Create** | Disconnect integration |
| `lib/services/team-github.ts` | **Modify** | Support both PAT and GitHub App tokens |
| `lib/supabase.ts` | **Modify** | Add `GitHubOAuthConfig` type |
| `components/team/github-connect-form.tsx` | **Modify** | OAuth button + PAT fallback + upgrade banner |
| `components/team/onboarding-wizard.tsx` | **Modify** | OAuth button as primary, PAT as secondary |
| `.env.example` | **Modify** | Add GitHub App env vars |
| **Database migration** | **Create** | `github_oauth_states` table |

---

## Sequence Diagram

```
Admin                    Work Intel                 GitHub
  │                          │                         │
  │  Click "Install App"     │                         │
  ├─────────────────────────►│                         │
  │                          │  Create state token     │
  │                          │  (github_oauth_states)  │
  │                          │                         │
  │  ◄── Redirect ───────── │                         │
  │                          │                         │
  │  Install app on org ─────────────────────────────►│
  │                          │                         │
  │  ◄──────────── Redirect to callback ──────────────│
  │     ?installation_id=X&state=Y&setup_action=install│
  │                          │                         │
  │                          │  Verify state token     │
  │                          │  Generate JWT from key  │
  │                          │  POST /installations/X  │
  │                          │    /access_tokens ──────►
  │                          │  ◄── access_token ──────│
  │                          │                         │
  │                          │  GET /installation      │
  │                          │    (get org info) ──────►
  │                          │  ◄── org details ───────│
  │                          │                         │
  │                          │  Save to DB:            │
  │                          │  { installation_id,     │
  │                          │    org, auth_type:      │
  │                          │    'github_app' }       │
  │                          │                         │
  │  ◄── Redirect to ────── │                         │
  │      settings page       │                         │
```

---

## Token Lifecycle

```
Report Generation Time:
  1. Read installation_id from team_integrations
  2. Sign JWT with private key (iat, exp=10min, iss=app_id)
  3. POST /app/installations/{id}/access_tokens
     → Returns token valid for 1 hour
  4. Use token for all GitHub API calls
  5. Token expires naturally (no storage, no refresh needed)
```

No long-lived tokens are ever stored. The `installation_id` + app private key can always generate fresh tokens. This is more secure than PATs.

---

## Dependencies

**NPM packages needed:**
- `jsonwebtoken` — for signing the GitHub App JWT (or use the `@octokit/auth-app` package)
- **Recommended**: `@octokit/auth-app` — handles JWT signing and installation token generation. Already works with Octokit.

Using `@octokit/auth-app`:
```typescript
import { createAppAuth } from '@octokit/auth-app';

const auth = createAppAuth({
  appId: GITHUB_APP_ID,
  privateKey: GITHUB_APP_PRIVATE_KEY,
  installationId: installationId,
});

const { token } = await auth({ type: 'installation' });
// token is valid for ~1 hour
```

This eliminates manual JWT signing and is the recommended approach from GitHub/Octokit.

---

## Testing Plan

1. **Happy path**: Install app on test org → verify token generation → verify API calls work
2. **PAT backward compat**: Existing PAT team still generates reports correctly
3. **Upgrade flow**: PAT team upgrades to GitHub App → old PAT overwritten → reports still work
4. **Error cases**: User cancels install, user isn't org admin (request flow), expired state token
5. **Token generation**: Verify fresh tokens are generated for each report (no stale tokens)
6. **Disconnect**: Disconnect removes integration, UI returns to connect state

---

## Estimated Effort

| Step | Effort |
|------|--------|
| 1. GitHub App setup (manual) | 30 min |
| 2-3. Env vars + DB migration | 15 min |
| 4. OAuth service | 2-3 hours |
| 5. API routes | 1-2 hours |
| 6. team-github.ts modification | 30 min |
| 7-8. UI components | 1-2 hours |
| 9-10. Env + deprecation banner | 15 min |
| Testing | 1-2 hours |
| **Total** | **~1-1.5 days** |
