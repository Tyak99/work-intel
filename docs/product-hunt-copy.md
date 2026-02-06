# Product Hunt Launch Copy

All drafted copy for the Work Intel Product Hunt launch. Ready to copy-paste.

---

## 1. Product Hunt Tagline

**Primary (51 chars):**
> See what your engineering team shipped this week

**Alternates:**
- "AI weekly reports for engineering teams, from GitHub" (52 chars)
- "Stop asking your team what they did last week" (47 chars)

---

## 2. Product Hunt Description

> ### The problem every engineering manager knows
>
> Every Monday morning, you're scrambling to figure out what your team actually did last week. You dig through GitHub, chase people on Slack, sit through a painful status meeting — and you still don't have the full picture.
>
> **Work Intel fixes this in 60 seconds.**
>
> Connect your GitHub org. Add your team. That's it. Every week, Work Intel reads your PRs, code reviews, and commit activity, then generates an AI-powered summary that tells you:
>
> - What each developer shipped
> - Which PRs are stuck or blocked
> - Who's reviewing whose code
> - Where attention is needed before things slip
>
> ### How it works
>
> 1. One admin connects your GitHub org (takes 60 seconds)
> 2. Add team members by email — they get invited automatically
> 3. Every Monday, everyone gets a clear weekly report
>
> The manager sees the team-wide view with velocity trends and blockers. Each developer sees their personal summary. Nobody has to write anything.
>
> ### Why we built this
>
> I managed a team of engineers and spent every Monday morning doing the same thing: scanning GitHub, cross-referencing Jira, asking people "what are you working on?" It took an hour to piece together what the team did last week.
>
> So I built the tool I wished I had. Work Intel reads the work that already happened and turns it into the report I used to write manually.
>
> ### Pricing
>
> - **Free**: Up to 5 team members, weekly reports
> - **Pro ($10/seat/month)**: Unlimited team size, daily reports, Slack integration (coming soon)
>
> We're just getting started — Jira/Linear integration, daily standups, and Slack delivery are coming next. But the GitHub weekly report alone has already saved our early teams their Monday morning status meeting.
>
> **Try it free. Setup takes 60 seconds.**

---

## 3. Maker's First Comment (Post within 60 seconds of launch)

> Hey Product Hunt! I'm the maker of Work Intel.
>
> Here's why I built this: I used to manage a team of engineers, and every Monday morning was the same drill. Open GitHub, scan through PRs across 6 repos, try to remember who was working on what, ping people on Slack for updates, then spend 30 minutes in a status meeting where half the team was just waiting for their turn to talk.
>
> After doing this for a year, I realized something obvious: all the information I needed already existed in GitHub. PRs merged, code reviews given, commits pushed — the work was already tracked. I was just manually piecing it together every week.
>
> So I built Work Intel. You connect your GitHub org once, add your team members, and every Monday you get an AI-generated report that tells you exactly what happened. Per-developer breakdowns, stuck PRs flagged automatically, code review patterns surfaced. The report I used to spend an hour writing now generates itself in 30 seconds.
>
> The thing I'm most proud of is the "Needs Attention" feature. It catches PRs that have been open for 3+ days with no reviews, or PRs where changes were requested but nothing happened. These are the things that slip through the cracks and turn into week-long blockers if nobody notices.
>
> What we're building next:
> - Jira/Linear integration (so the report includes ticket context, not just PRs)
> - Daily standup generation (your standup written for you, from your actual work)
> - Slack delivery (report drops in your channel, no need to open another app)
>
> I'd love to hear how you currently handle team visibility. What's your Monday morning routine? And if you try Work Intel, I'm here all day to answer questions and hear feedback.
>
> Thanks for checking us out!

---

## 4. Show HN Post

**Title:**
> Show HN: Work Intel - AI weekly reports for engineering teams, generated from GitHub

**Body:**
> I built a tool that generates weekly engineering team reports from GitHub activity.
>
> The problem: every Monday, engineering managers scramble to figure out what the team did last week. You dig through PRs across multiple repos, ask people on Slack, sit through status meetings. The information exists in GitHub — it's just scattered.
>
> Work Intel connects to your GitHub org and generates a weekly summary:
> - Per-developer breakdown: what they shipped, what's in progress
> - Stuck PR detection: PRs open 3+ days with no reviews
> - Blocked PR flagging: changes requested but no follow-up
> - Code review patterns: who's reviewing, who's waiting
> - AI-generated narrative summary of the team's week
>
> Setup: one admin pastes a GitHub org token. That's it. Team members get invited by email and see their personal weekly summary with zero setup.
>
> Stack: Next.js, Supabase, Claude for AI summaries, deployed on Vercel.
>
> The AI doesn't hallucinate metrics — it reads real PR data and summarizes it. The structured data (PR counts, review stats) comes directly from the GitHub API. Claude generates the narrative summary and highlights.
>
> Free for teams up to 5. Pro is $10/seat/month.
>
> Live at: [URL]
>
> Would love feedback, especially from engineering managers who deal with the Monday morning visibility problem.

---

## 5. Reddit Post — r/ExperiencedDevs

**Title:**
> I got tired of spending Monday mornings figuring out what my team shipped, so I built a tool that generates weekly reports from GitHub

**Body:**
> I managed a team of engineers for a couple years and the most tedious part of my week was Monday morning. Every week, same routine:
>
> - Open GitHub, scan PRs across 6+ repos
> - Try to figure out what actually merged vs what's still in review
> - Ping people on Slack: "Hey, is that PR blocked or just waiting on review?"
> - Sit through a status meeting where people basically read their PR titles out loud
>
> The information was all there in GitHub. I was just manually assembling it into a narrative every single week.
>
> So I built Work Intel. You connect your GitHub org, add your team, and it generates an AI-powered weekly summary. Per-developer breakdowns, stuck PRs flagged automatically (open 3+ days, no reviews), blocked PR detection, code review activity.
>
> The part that's saved me the most time is the "Needs Attention" section. It catches the PRs that are about to become problems — changes requested but no follow-up, reviews assigned but never started. These are the things that silently block your sprint.
>
> Setup takes about 60 seconds. One admin connects GitHub, invites the team by email, done.
>
> Free for teams up to 5. Would love to hear if this resonates with other engineering managers, or if you've solved this problem differently.
>
> [URL]

---

## 6. Reddit Post — r/SaaS

**Title:**
> Launched my B2B dev tool: AI weekly reports for engineering teams. $0 to first paying customers — here's the playbook

**Body:**
> Hey r/SaaS — I just launched Work Intel, a tool that generates AI-powered weekly engineering reports from GitHub data.
>
> **The problem:** Engineering managers spend Monday mornings manually piecing together what their team did last week from scattered GitHub data. Status meetings exist because there's no single view of team output.
>
> **The product:** Connect your GitHub org. Add your team. Get a weekly AI-generated report covering PRs merged, stuck code reviews, blockers, and per-developer summaries. Setup takes 60 seconds.
>
> **What makes it work as a business:**
> - The buyer (eng manager) has budget and a real pain point
> - One person sets up, the whole team gets value (viral within the org)
> - $10/seat/month — easy expense approval for a 10-person team ($100/mo)
> - Free tier for teams up to 5 (land and expand)
>
> **Stack:** Next.js, Supabase (Postgres), Claude API for summaries, Vercel for hosting, Resend for emails. Total infra cost is under $50/month.
>
> **Go-to-market:** Starting with Product Hunt launch today, then content marketing targeting "engineering team visibility" keywords. The wedge is the weekly report — once teams rely on it, we expand to daily standups and Jira/Linear integration.
>
> Would love feedback from other SaaS founders on the positioning and pricing.
>
> [URL]

---

## 7. Twitter/X Launch Thread (5 tweets)

**Tweet 1:**
> I just launched Work Intel on Product Hunt.
>
> It generates AI-powered weekly reports for engineering teams from GitHub data.
>
> No more Monday morning status meetings. No more manually scanning PRs across repos.
>
> Here's what it does and why I built it:
>
> [PH link]

**Tweet 2:**
> The problem:
>
> Every Monday, engineering managers piece together what the team did last week.
>
> Open GitHub. Scan PRs across 6 repos. Ping people on Slack. Sit through a status meeting.
>
> The data is all in GitHub already. You're just assembling it manually.

**Tweet 3:**
> What Work Intel does:
>
> - Connects to your GitHub org (60-second setup)
> - Generates a weekly report with AI summaries
> - Per-developer breakdowns: what shipped, what's in flight
> - Flags stuck PRs (3+ days, no reviews)
> - Catches blocked PRs (changes requested, no update)
>
> One admin connects. The whole team gets value.

**Tweet 4:**
> The feature I'm most proud of: "Needs Attention"
>
> It catches the PRs that are about to become problems before anyone notices.
>
> Open 4 days with no reviewer? Flagged.
> Changes requested but no follow-up? Flagged.
>
> These are the things that silently block your sprint.

**Tweet 5:**
> Work Intel is free for teams up to 5.
>
> If you manage an engineering team and you're tired of writing the weekly update yourself, give it a try.
>
> Setup takes 60 seconds. First report generates instantly.
>
> Would love your feedback on Product Hunt today:
>
> [PH link]

---

## 8. Email to Coming Soon List

**Subject line:** We're live on Product Hunt today

**Body:**

> Hey!
>
> You signed up to get notified when Work Intel launches — and today's the day.
>
> We just went live on Product Hunt:
> [PH link]
>
> Quick reminder of what Work Intel does: it connects to your GitHub org and generates AI-powered weekly reports for your engineering team. Per-developer summaries, stuck PR detection, code review patterns — the report your manager would write if they had time to read every PR.
>
> **Setup takes 60 seconds.** One admin connects GitHub, invites the team, done. Free for teams up to 5.
>
> If you have 30 seconds, I'd really appreciate:
> 1. An upvote on Product Hunt (it makes a huge difference for visibility)
> 2. A comment if you have thoughts — I'm responding to every single one today
>
> And if you try the product and hit any issues, reply to this email. I'm the maker and I'll help you directly.
>
> Thanks for the early support. It means a lot.
>
> — [Founder name]
>
> P.S. If you manage an engineering team and want to kill your Monday status meeting, today's a great day to try Work Intel. Your first report generates in 30 seconds.

---

## 9. Post-Launch Follow-Up Email

**Subject line:** We hit #[X] on Product Hunt — here's what's next

**Body:**

> Hey!
>
> Quick update: Work Intel launched on Product Hunt yesterday and we hit #[X] for the day.
>
> [X] teams signed up. [X] reports generated. And the feedback has been incredible — here are the top requests:
>
> 1. Jira/Linear integration (coming next)
> 2. Slack delivery (on the roadmap)
> 3. Daily standup generation (planned for Q2)
>
> If you haven't tried it yet, now's a great time. We're offering [early-adopter pricing / extended free trial] for everyone who signed up on our Coming Soon page.
>
> **Get started:** [URL]
>
> And if you already tried it — reply to this email with your honest feedback. What's working? What's missing? I read every response.
>
> Thanks for being an early supporter.
>
> — [Founder name]

---

## Key Messaging Guidelines

When responding to comments on any platform, keep these principles in mind:

**Be specific, not generic.** "We read PR metadata from the GitHub API and generate summaries with Claude" is better than "We use AI to analyze your codebase."

**Acknowledge limitations honestly.** "Right now it's GitHub only — Jira/Linear is our next priority" builds more trust than pretending you do everything.

**Lead with the pain point.** "Monday morning status meetings" is a universal pain that engineering managers immediately recognize. Use it.

**Differentiate from GitHub Insights.** GitHub shows charts. Work Intel writes the narrative. It's the difference between a dashboard and a report your manager would write.

**The setup story is your hook.** "60 seconds to set up, one person connects, the whole team benefits" — this is what makes people stop scrolling. Most dev tools require every team member to connect individually.
