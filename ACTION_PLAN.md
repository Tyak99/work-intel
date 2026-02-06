# Work Intel: Rescue Action Plan

> **Generated Feb 5, 2026** by a 4-agent audit team (code security, UX/product, infrastructure, market research). This is the definitive "what to do next" document.

---

## The Diagnosis

Your **core product works** — team creation, GitHub connection, AI-powered weekly reports, member management, email delivery. The AI summaries are a genuine differentiator that competitors don't have.

But the product is **not launchable** in its current state:
- The database is wide open (anyone can read all data including session tokens)
- There's no landing page, no billing, no pricing
- The default theme screams "side project" not "$10/seat B2B tool"
- Missing basic SaaS infrastructure (error tracking, legal pages, email compliance)

**The good news**: None of this is a rewrite. It's packaging, polish, and plugging security holes.

---

## PHASE 0: STOP THE BLEEDING (Do This Week)

*These are security vulnerabilities that make the app unsafe for any real users.*

### 0.1 Fix Supabase RLS — The #1 Critical Issue [Done]
**Effort: Medium | Impact: Critical**

All 15 tables are either RLS-disabled or have `USING (true)` bypass policies. Anyone with the public anon key (exposed in client JS) can read session tokens, user emails, OAuth tokens, and all team data via PostgREST.

**Recommended fix**: Since ALL Supabase access is server-side (API routes), switch to using the **service role key** for server-side operations. The anon key should have zero access. Then add proper RLS policies as defense-in-depth.

Tables to fix immediately:
- `sessions` (token exposure = full account takeover)
- `team_integrations` (contains GitHub/Jira tokens)
- `users` (PII exposure)
- `team_invites` (invite tokens)
- All remaining tables

### 0.2 Encrypt Jira OAuth Tokens [Done]
**Effort: Small | Impact: Critical**

GitHub tokens are encrypted with AES-256-GCM, but Jira tokens are stored in plaintext in `team_integrations.config`. Use the same `encrypt()` function from `lib/utils/encryption.ts`.

**File**: `lib/services/atlassian-oauth.ts:310-331`

### 0.3 Stop Returning Integration Secrets to Frontend [Done]
**Effort: Small | Impact: Critical**

`app/api/teams/[teamId]/route.ts:28` does `select('*')` on `team_integrations`, sending encrypted tokens to every team member's browser. Strip `config` from the response.

### 0.4 Fix Cron Auth Bypass [Done]
**Effort: Small | Impact: Critical**

Two issues:
1. `app/api/cron/weekly-reports/route.ts:13-14` — allows all requests if `CRON_SECRET` not set. Change to deny by default.
2. `app/api/brief/generate/route.ts:10-19` — `x-vercel-cron` header is spoofable. Use `CRON_SECRET` bearer token pattern instead.

### 0.5 Add ENCRYPTION_KEY to .env.example [Done]
**Effort: Tiny | Impact: High**

Missing from `.env.example`. Deployments without it crash at runtime when GitHub is connected.

### 0.6 Fix Missing Team Auth Check on Jira Endpoint [Done]
**Effort: Tiny | Impact: High**

`app/api/teams/[teamId]/jira/project/route.ts` — GET handler never calls `requireTeamMembership()`. Any authenticated user can read any team's Jira config.

---

## PHASE 1: LAUNCH ESSENTIALS (Weeks 1-2)

*The minimum viable "paid SaaS" experience.*

### 1.1 Switch Default Theme to Professional/Clean [Done]
**Effort: Small | Impact: Very High (conversion)**

The cyberpunk "Dark Future" theme with neon glow, "Mission Control" language, and Rajdhani font is wrong for B2B engineering managers. Switch default to the "Original" clean theme. Consider making it the only theme for now.

### 1.2 Fix Login Page Messaging [Done]
**Effort: Small | Impact: High (first impression)**

Login page promotes "Daily Briefs", "Smart Actions", "Jira/GitHub/email" — the old product. Rewrite to match the team weekly recap positioning:
- "Weekly Team Reports" — AI-powered summaries of what your team shipped
- "GitHub Activity" — PRs, reviews, commits at a glance
- "Zero Setup for Members" — Admin connects, team gets value

**File**: `app/login/page.tsx`

### 1.3 Add Favicon, Logo, OG Tags, Meta [Done]
**Effort: Small | Impact: High (credibility)**

- No favicon exists (generic browser icon)
- No OpenGraph images (Slack/Twitter links show nothing)
- Meta title still says "Work Intel | Mission Control"
- No `/public` directory with any assets

### 1.4 Build Landing Page [Done]
**Effort: Large | Impact: Critical (conversion)**

Currently unauthenticated users hit a redirect to `/login`. There's no public page explaining what the product does. Structure (from market research):

1. **Hero**: "See what your team shipped this week" + screenshot + "Start Free" CTA
2. **Social proof bar**: "Join X engineering teams" (even "Join our beta" works early)
3. **Problem statement**: "Your team ships great work. But who knows about it?"
4. **3-4 feature blocks** with screenshots
5. **How it works**: 3 steps (Connect GitHub → Add team → Get report Monday)
6. **Pricing table**: Free (5 members) / Team ($10/seat) / Business ($18/seat)
7. **Final CTA**: "Start your free team recap in 2 minutes"

### 1.5 Integrate Stripe Billing [Deferred]
**Effort: Large | Impact: Critical (revenue)**

No path to revenue exists. Use Stripe Checkout for fastest implementation.

**Pricing tiers:**
- Free: 1 team, up to 5 members, weekly reports only, 4 weeks of report history
- Team ($10/seat/month annual, $12/month monthly): Unlimited members, multiple GitHub orgs, on-demand reports, 6 months history, Slack delivery (future), no Work Intel branding on reports
- Business ($18/seat/month annual, $22/month monthly): Everything in Team + Jira/Linear (future), SSO, API access, priority support, 1 year history

**Expected outcome:**
- A `/billing` or `/team/[slug]/billing` page where admins can see their current plan, upgrade/downgrade, and manage payment method
- Stripe Checkout for payment (redirect to Stripe, not custom payment form)
- Stripe webhook endpoint to handle subscription events (created, updated, canceled, payment failed)
- Plan enforcement: when a free team tries to add a 6th member, show an upgrade prompt instead of allowing it. When a free team tries to generate an on-demand report more than once per week, show upgrade prompt.
- A "Pro" or "Team" badge on paid teams in the UI
- Billing status stored in a new `subscriptions` table or as a field on the `teams` table
- Grace period: if payment fails, don't immediately lock the team out — show a warning banner for 7 days, then restrict to free tier features
- The landing page pricing section should link to signup, not directly to Stripe (user needs a team first)

### 1.6 Add Privacy Policy and Terms of Service [Done]
**Effort: Medium | Impact: High (trust + compliance)**

Required for:
- Handling GitHub data (GitHub's terms require this)
- CAN-SPAM compliance
- Enterprise buyer trust
- App store listings (GitHub Marketplace)

### 1.7 Add Email Unsubscribe Links [Done]
**Effort: Small | Impact: High (compliance)**

No unsubscribe link in any email template. Required by CAN-SPAM. Add to both weekly report and invite emails.

### 1.8 Add Security Headers [Done]
**Effort: Small | Impact: Medium (security)**

Missing: CSP, HSTS, X-Frame-Options, X-Content-Type-Options. Add via `next.config.js` `headers()` or `vercel.json`.

### 1.9 Add Error Tracking (Sentry)
**Effort: Small | Impact: High (operations)**

Zero production observability. If the cron job fails, emails bounce, or API errors spike, nobody knows.

**Expected outcome:**
- Sentry SDK integrated into the Next.js app (both client and server)
- All unhandled exceptions automatically captured with stack traces and context
- The weekly report cron job should have explicit Sentry breadcrumbs so failures show which team/step failed
- Alert rules: notify on first occurrence of any new error, and when error rate exceeds 10/hour
- Source maps uploaded during build for readable stack traces
- Environment tagging (production vs development) so dev errors don't create noise
- `SENTRY_DSN` env var — gracefully no-ops when not set (same pattern as PostHog)
- Performance monitoring enabled (traces API route response times, identifies slow endpoints)

### 1.10 Add Invite Token Expiry [Done]
**Effort: Small | Impact: Medium (security)**

Invite tokens never expire. Add `expires_at` column (default 7 days), check during acceptance.

---

## PHASE 2: POLISH FOR PAYING CUSTOMERS (Weeks 3-4)

*The difference between "it works" and "I'd pay for this."*

### 2.1 Build Onboarding Wizard [Done]
**Effort: Medium | Impact: Very High (activation)**

Current flow: create team → navigate to settings → paste GitHub PAT → go back → generate report. That's 5+ clicks with no guidance.

Build a 3-step wizard:
1. Name your team
2. Connect GitHub (with link to token creation page + scope instructions)
3. Add team members (email invites)
→ Auto-generate first report as demo

### 2.2 Fix Loading States [Done]
**Effort: Medium | Impact: High (polish)**

Replace all plain text "Loading..." with skeleton loaders:
- Team dashboard: skeleton stat cards + member card placeholders
- Settings page: skeleton form
- Home page: already has pulsing cards (acceptable)
- Kill the cyberpunk "LOADING..." spinner with neon glow

### 2.3 Improve Empty States [Done]
**Effort: Medium | Impact: High (first-time experience)**

The "no report yet" empty state is where most new users land first. Show:
- Preview/illustration of what a report looks like
- Explanation of what they'll get
- Prominent "Generate Your First Report" CTA
- Expected delivery time

### 2.4 Add Error Boundaries and 404 Page [Done]
**Effort: Small | Impact: Medium (polish)**

No `error.tsx` or `not-found.tsx` anywhere. Crashes show default Next.js error page. Add branded error and 404 pages.

### 2.5 Fix Mobile Responsiveness [Done]
**Effort: Medium | Impact: Medium**

`MemberCard` stats overflow on mobile. `MemberManagement` invite form doesn't stack. Settings page needs responsive layout.

### 2.6 Add Remove Member Confirmation Dialog [Done]
**Effort: Tiny | Impact: Medium (trust)**

Clicking the trash icon instantly removes a member with no confirmation. Every SaaS app has a confirmation dialog for destructive actions.

### 2.7 Add Rate Limiting [Done]
**Effort: Medium | Impact: High (security + cost protection)**

No rate limiting anywhere. Add via `@upstash/ratelimit`:
- Invite sending: 10/hour per team
- Report generation: 5/day per team
- Login: 20/hour per IP
- API general: 100/minute per user

### 2.8 Add Input Validation with Zod [Done]
**Effort: Medium | Impact: Medium (robustness)**

API routes have minimal validation. Add Zod schemas for:
- Team creation (name length limits)
- Invite creation (email format validation)
- GitHub config (org name format)
- UUID format on path parameters

### 2.9 Add Health Check Endpoint [Done]
**Effort: Tiny | Impact: Medium (operations)**

`/api/health` — returns 200 with DB connectivity check. Needed for uptime monitoring.

### 2.10 GitHub API Rate Limit Handling [Done]
**Effort: Medium | Impact: High (reliability)**

No rate limit detection in `team-github.ts`. A 10-person team makes 40 API calls. Add:
- Rate limit header checking
- Exponential backoff
- Retry-after handling
- Graceful degradation (partial report if rate limited)

---

## PHASE 3: GROWTH PREPARATION (Month 2)

*Setting up for the first 100 paying teams.*

### 3.1 Replace GitHub PAT with GitHub OAuth App [In Progress]
**Effort: Large | Impact: Very High (activation)**

Manually creating a PAT is the highest-friction step in onboarding. A proper GitHub App OAuth flow is one-click. This is what every competitor uses.

**Implementation plan**: See [`docs/GITHUB_OAUTH_IMPLEMENTATION_PLAN.md`](docs/GITHUB_OAUTH_IMPLEMENTATION_PLAN.md) for the full technical spec.

**Expected outcome:**
- Admin clicks "Connect GitHub" and gets redirected to GitHub's OAuth/App installation flow
- After authorizing, they're redirected back and the GitHub org is automatically connected — no token pasting
- The app requests these permissions: read access to organization, repos, pull requests, commits, and members
- A GitHub App (not just OAuth App) so it appears as an "installed app" on the org, not tied to one person's account
- Existing teams that used PAT continue to work (backward compatible) — show a banner suggesting they upgrade to the OAuth connection
- Token refresh handled automatically (GitHub App tokens expire, unlike PATs)
- Team settings shows "Connected via GitHub App" with the org name, and a "Disconnect" button
- The onboarding wizard's "Connect GitHub" step uses this new flow instead of the PAT form
- Scopes needed: `repo` (read), `read:org`, `read:user`

### 3.2 Add Slack Integration
**Effort: Large | Impact: High (engagement + retention)**

Market research shows this is the #1 requested integration for weekly reports. Many teams want reports in Slack, not email.

**Expected outcome:**
- Admin clicks "Connect Slack" in team settings, goes through Slack OAuth, selects a channel
- Weekly reports are automatically posted to the connected Slack channel on Monday morning (same time as email)
- Report format in Slack: a rich message (Block Kit) with the team summary, key stats (PRs merged, stuck, reviews), and a "View full report" link back to the web dashboard
- Per-member breakdowns are NOT posted to Slack (too long) — just the team summary with a link
- Slack channel is configurable in team settings (can change after initial setup)
- "Test Slack delivery" button in settings to send a sample message
- Slack notifications should be in addition to email, not replacing it — both channels active by default, each can be toggled off in team settings
- Slack App needs these scopes: `chat:write`, `channels:read` (to list channels for selection)
- Stored in `team_integrations` table with `provider: 'slack'` and config containing `channel_id`, `channel_name`, `access_token`

### 3.3 Add Analytics (PostHog/Mixpanel) [Done]
**Effort: Small | Impact: High (growth intelligence)**

Track: signups, team creation, GitHub connection, first report, weekly active teams, email opens. Essential for understanding funnel and retention.

### 3.4 Add Week-over-Week Trends [Done]
**Effort: Medium | Impact: High (value + retention)**

Currently shows only the latest week. Managers want to see trends: "PRs merged trending up 20% over 4 weeks." This keeps them coming back.

### 3.5 Prepare Product Hunt Launch [Done]
**Effort: Medium | Impact: Very High (acquisition)**

- Create "Coming Soon" page on Product Hunt
- Record 60-second demo video / animated GIF
- Prepare launch copy and assets
- Engage in PH community 4-6 weeks before launch
- Aim for Tuesday launch, be available all day for comments

### 3.6 Write 2-4 SEO Blog Posts [Done]
**Effort: Medium | Impact: Medium (long-term acquisition)**

Target keywords:
- "engineering team weekly report template"
- "GitHub activity summary for managers"
- "automated standup updates"
- "engineering metrics for small teams"

### 3.7 Set Up Referral Program
**Effort: Medium | Impact: Medium (virality)**

Engineering managers know other engineering managers. Word-of-mouth is the #1 driver for dev tools.

**Expected outcome:**
- Each team gets a unique referral link (e.g., `work-intel.vercel.app/r/abc123`)
- When someone signs up via the referral link and creates a paid team, the referring team gets 1 month free (credit applied to next invoice)
- The referred team also gets 1 month free (incentive on both sides)
- Referral link is visible in team settings with a "Copy link" button and share text
- A simple `referrals` table tracking: referrer_team_id, referred_team_id, status (pending/credited), created_at
- Credit is applied via Stripe (requires billing integration first — this depends on 1.5)
- Dashboard in settings showing "You've referred X teams, earned Y months free"
- The referral link landing page shows a personalized message: "[Team name] thinks you'd love Work Intel" before the normal signup flow

### 3.8 Add Structured Logging and Audit Trail [Done]
**Effort: Medium | Impact: Medium (compliance + debugging)**

Log: member add/remove, role changes, integration connects, invite send/revoke. Needed for enterprise sales and debugging.

### 3.9 Session Cleanup Cron Job [Done]
**Effort: Small | Impact: Low (hygiene)**

Sessions expire after 30 days but accumulate in the DB. Add cleanup to the existing cron schedule.

### 3.10 Add Missing Database Indexes [Done]
**Effort: Small | Impact: Low (performance)**

7 foreign keys without covering indexes: `sessions.user_id`, `nylas_grants.user_uuid`, `team_integrations.connected_by`, `team_invites.invited_by`, `atlassian_oauth_states.team_id/user_id`, `drive_oauth_states.user_id`.

---

## Effort Summary

| Phase | Items | Estimated Effort | Timeline |
|-------|-------|-----------------|----------|
| Phase 0: Stop the Bleeding | 6 items | 2-3 days | This week |
| Phase 1: Launch Essentials | 10 items | 2 weeks | Weeks 1-2 |
| Phase 2: Polish | 10 items | 2 weeks | Weeks 3-4 |
| Phase 3: Growth | 10 items | 4 weeks | Month 2 |

---

## Competitive Positioning

### Your Unfair Advantages
1. **AI-powered summaries** — No competitor generates natural language team recaps with Claude
2. **Simplicity** — "Basecamp of engineering intelligence" vs enterprise bloat
3. **Price** — $10/seat vs $20-49/seat competitors (Haystack, Swarmia, LinearB)
4. **Time to value** — Target: first report in under 5 minutes

### Your Target Customer
Engineering manager of a 10-25 person team who:
- Is tired of writing weekly updates manually
- Wants visibility into what shipped without micromanaging
- Can expense $150/month on a corporate card (no procurement needed)
- Is NOT looking for DORA metrics or engineering management platforms

### 90-Day Revenue Target
- 15 beta teams (free) by Day 30
- 10+ paying teams by Day 60 (Product Hunt launch)
- 30+ paying teams, $3,000+ MRR by Day 90

---

## What NOT to Do

1. **Don't add more integrations yet** — GitHub-only is the right scope for launch
2. **Don't build DORA metrics** — that's what competitors do; your edge is AI summaries
3. **Don't target enterprise** — target EMs at startups/mid-market who buy with a credit card
4. **Don't over-engineer billing** — Stripe Checkout, not a custom billing system
5. **Don't chase features** — chase polish, speed, and reliability
