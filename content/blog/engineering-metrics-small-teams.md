---
title: "Engineering Metrics for Small Teams: Skip DORA, Track What Matters"
description: "Why DORA metrics and engineering intelligence platforms are overkill for teams under 30. What small teams should actually track instead."
date: "2026-02-05"
author: "Work Intel Team"
tags: ["engineering-management", "engineering-metrics", "small-teams"]
---

# Engineering Metrics for Small Teams: Skip DORA, Track What Matters

If you manage a team of 5-15 engineers, you've probably been told you need to track DORA metrics. Deployment frequency. Lead time for changes. Change failure rate. Time to restore service.

You've probably also looked at engineering intelligence platforms — Jellyfish, LinearB, Swarmia, Pluralsight Flow — and felt a mix of FOMO and skepticism. They look impressive in demos. They cost $20-40 per developer per month. And they require weeks of setup, calibration, and buy-in before they produce anything useful.

Here's the thing: most of these tools and frameworks were built for organizations with 50-500+ engineers. They solve problems you don't have yet. And the metrics they prioritize can actively mislead small teams.

Let me explain, and then offer a simpler alternative.

## Why DORA Metrics Miss the Point for Small Teams

DORA metrics (from Google's DevOps Research and Assessment) are well-researched and genuinely valuable — at scale. They were designed to measure engineering *capability* across large organizations. They answer the question: "Is our engineering organization performing at an elite, high, medium, or low level?"

That's a useful question if you're a VP of Engineering with 200 engineers across 20 teams and you need a standardized way to compare and improve. It's not a useful question if you're managing 8 people and you already know exactly who's doing what.

### Deployment Frequency

DORA says elite teams deploy multiple times per day. But for a small team, deployment frequency depends entirely on what you're building. A team working on a complex backend migration might deploy once a week and be doing exceptional work. A team building CRUD features might deploy ten times a day and be shipping nothing of consequence.

Tracking deployment frequency for a small team just creates pressure to ship for the sake of shipping.

### Lead Time for Changes

This measures the time from commit to production. It's useful for identifying process bottlenecks in large organizations — slow CI pipelines, heavy approval processes, manual deployment gates. But in a small team, if your lead time is too long, you already know why. It's because Jamie hasn't reviewed the PR, or the staging environment is broken again. You don't need a metric to tell you that.

### Change Failure Rate and MTTR

These are operational health metrics. They matter enormously for teams running mission-critical infrastructure at scale. For a small team with a handful of services, you know when things break. You're probably in the incident channel yourself.

## What Small Teams Should Track Instead

Small teams have different failure modes than large organizations. Your risks aren't "we can't measure our deployment pipeline." Your risks are:

1. **Work gets stuck and nobody notices.** A PR sits for days without a review. An engineer is blocked but doesn't raise it because they don't want to seem like they're not making progress.

2. **One person becomes a bottleneck.** All reviews go through the same senior engineer. Knowledge is siloed. When that person is on vacation, everything stalls.

3. **You lose visibility as the team grows.** When your team was 3 people, you knew everything. At 8 people, things start falling through cracks. At 12, you're flying blind without some system in place.

4. **Good work goes invisible.** Engineers do important work that nobody sees because it wasn't a shiny feature. Refactoring, bug fixes, code reviews — the maintenance work that keeps the system healthy.

Here are the metrics that actually help with these problems.

### 1. Stuck Work Count

How many items are currently stuck? This means PRs without reviews for more than 2 days, PRs with changes requested but no follow-up, and tickets that haven't moved in a week.

This is the single most useful metric for a small team. Each stuck item represents value that's 80% delivered but stuck at the finish line. Unsticking work has a better ROI than starting new work.

Check this number every Monday. If it's going up, you have a flow problem.

### 2. Review Bottleneck Index

Who's doing the reviews, and how long are they taking? If one person is doing 60% of all reviews, you have a bus factor problem and a bottleneck. If reviews are averaging 3+ days, your team's work-in-progress is too high — people are starting new things instead of finishing existing ones.

The fix is usually cultural, not process. Make it clear that reviewing a teammate's PR is as important as writing your own code. Some teams dedicate the first hour of each day to reviews.

### 3. Shipping Velocity (Team-Level, Weekly)

How many meaningful items did the team ship this week? Count merged PRs, but weight them by significance. Three infrastructure PRs and a feature launch is a better week than fifteen typo fixes, even though the numbers look different.

Don't track this per-person. Track it per-team. If the team number is consistent, things are healthy. If it drops, investigate.

### 4. Work in Progress (WIP)

How many things is each person working on simultaneously? For most engineers, the ideal WIP limit is 1-2 items. If someone has 5 open PRs, they're context-switching too much. If someone has 0 open PRs and no merged PRs, they might be stuck or working on something that isn't producing artifacts.

This isn't a metric to enforce rigidly. It's a metric to check when things feel slow. High WIP almost always correlates with slow delivery.

## The Basecamp Approach to Engineering Metrics

Basecamp (the company) has a philosophy about business metrics that applies well to small engineering teams: track the vital few, ignore the trivial many. Their approach to metrics is:

1. **Pick 2-3 numbers that matter.**
2. **Check them weekly, not daily.**
3. **Use them to start conversations, not to evaluate individuals.**
4. **Change them when they stop being useful.**

For a small engineering team, those 2-3 numbers might be:
- Stuck work count (are things flowing?)
- Team PRs merged this week (are we shipping?)
- Oldest open PR age (is something being forgotten?)

That's it. No dashboards. No percentile rankings. No four-metric framework with color coding. Just three numbers that a manager can check in 5 minutes on Monday morning.

## Why Engineering Intelligence Platforms Are Overkill

If you've evaluated tools like Jellyfish, LinearB, Swarmia, Pluralsight Flow, or similar platforms, you've probably noticed a few things:

**They're expensive.** $20-40/developer/month adds up fast. For a 10-person team, you're looking at $2,400-4,800/year. That's a lot of money for metrics you can get from a Monday morning GitHub check.

**They require calibration.** These tools need weeks to calibrate baselines, set up team definitions, configure which repos matter, and tune their algorithms. That's fine if you're rolling out to 200 developers. For 10 developers, the setup time may exceed the time you'd spend just checking GitHub.

**They track too much.** These platforms give you dozens of metrics, charts, and trend lines. For a large org, that's necessary — different teams have different needs. For a small team, it's information overload. You end up spending time configuring dashboards instead of managing your team.

**They create a surveillance feeling.** When you install a tool that tracks every commit, every PR, and every review at the individual level, engineers notice. Even if you never look at individual metrics, the presence of the tool changes behavior. People start optimizing for the metrics instead of for outcomes.

## A Simpler Alternative

What most small teams actually need is:
- A weekly summary of what shipped and what's stuck
- Per-person visibility so work doesn't go invisible
- Alerts when something has been stuck too long
- Zero setup burden on individual engineers

This is what we built Work Intel to do. One admin connects your GitHub org, and the whole team gets a weekly report with team-level stats, per-person summaries, and stuck-work detection. No dashboards to configure, no metrics to calibrate, no per-developer tracking that makes people uncomfortable. Just a weekly email that tells you what happened and what needs your attention.

It's engineering intelligence for teams that don't need a platform — just a clear picture of how the week went.

## Right-Size Your Metrics

The most effective engineering managers I've worked with at small teams share a common trait: they resist the urge to over-measure. They pick a small number of signals, check them regularly, and use them as conversation starters rather than scorecards.

As your team grows, your metrics needs will grow with it. A 50-person engineering org genuinely needs DORA metrics and standardized measurement across teams. But if you're at 5-15 engineers today, start simple.

Track stuck work. Watch your review bottlenecks. Count what you shipped this week. That's enough to manage well. Everything else is a distraction dressed up as rigor.
