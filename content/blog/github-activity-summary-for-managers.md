---
title: "GitHub Activity Summaries for Managers: What to Track (and What to Ignore)"
description: "How engineering managers can use GitHub data for team visibility without micromanaging. Focus on the metrics that matter."
date: "2026-02-05"
author: "Work Intel Team"
tags: ["engineering-management", "github", "engineering-metrics"]
---

# GitHub Activity Summaries for Managers: What to Track (and What to Ignore)

There's a tension at the heart of engineering management. You need visibility into what your team is doing. But the moment you start counting commits or tracking lines of code, you're micromanaging — and your best engineers will resent it.

The good news is that GitHub already contains almost everything you need to understand your team's health. The bad news is that most of the metrics people pull from GitHub are useless or actively misleading.

Here's how to use GitHub data as a management tool without turning it into a surveillance system.

## The Metrics That Actually Matter

Let's start with what you should be paying attention to.

### 1. PRs Merged Per Week (Team-Level)

This is your team's shipping velocity. Not per-person — per-team. Tracking individual PR counts creates all the wrong incentives (small PRs, split work, gaming the metric). But at the team level, a consistent count of merged PRs tells you whether work is flowing or stalling.

What to watch for:
- **Sudden drops**: If your team normally merges 15 PRs a week and this week it's 4, something is wrong. Maybe reviews are backed up, maybe people are stuck, maybe there's a big refactor in progress.
- **Sustained low periods**: Two or more weeks of low merge rates usually indicates a systemic issue — unclear requirements, architectural uncertainty, or too much work in progress.

What not to do: set a target. The moment you say "we should merge 20 PRs a week," people will optimize for the metric instead of the outcome.

### 2. Review Turnaround Time

How long does a PR sit before it gets its first review? This is one of the strongest signals of team health. Fast review cycles mean:
- Engineers aren't context-switching while waiting
- Knowledge is being shared through code review
- Work flows through the system instead of piling up

A healthy target is first review within 24 hours for most PRs. If PRs are routinely waiting 2-3 days for a first look, you have a bottleneck — usually caused by too few reviewers, unclear ownership, or a culture where reviews feel optional.

### 3. Stuck PRs

A "stuck" PR is one that's been open for more than a few days with no activity. These are the silent productivity killers. The engineer who opened it has either moved on to something else (creating more work in progress) or is blocked and hasn't raised it.

Look for:
- **PRs with no reviews**: Nobody's looked at it. Is it assigned? Is it too big? Is it in a part of the codebase nobody owns?
- **PRs with "changes requested" but no follow-up**: The author got feedback and never responded. Are they stuck on the feedback? Did they disagree and not say anything?
- **PRs that keep getting updated but never merge**: This is scope creep in PR form. The PR started as a small fix and has grown into a refactor.

Stuck PRs are the single most actionable thing you can surface from GitHub data. Each one represents work that's *almost* done but isn't delivering value.

### 4. Review Distribution

Who's doing all the reviews? In most teams, one or two people review the majority of PRs. This creates a bottleneck and a bus factor problem. If your top reviewer goes on vacation, everything stalls.

Check whether reviews are distributed reasonably across the team. If they're not, it might be time to set up a review rotation or have a conversation about shared ownership.

## The Metrics That Don't Matter (But People Track Anyway)

### Commits Per Developer

This number tells you almost nothing. A developer who makes 50 small commits isn't more productive than one who makes 5 well-structured ones. Some people commit frequently as a working style. Others squash everything into clean atomic commits. Neither approach is better, and comparing commit counts across engineers is meaningless.

### Lines of Code

The classic vanity metric. Deleting code is often more valuable than adding it. A developer who removes 500 lines of dead code while adding 50 lines of clean replacement has done excellent work — but their "lines added" looks unimpressive.

### Individual PR Counts

We covered this above, but it bears repeating. Tracking individual PR counts incentivizes splitting work into smaller, less meaningful chunks. It penalizes the engineer who spent the week on one important, complex PR. Don't do this.

### GitHub Activity Graphs (Green Squares)

Those contribution graphs on GitHub profiles are fun for personal motivation but meaningless for management. They count commits, issues, and PRs without any context about what those contributions actually achieved.

## How to Get a GitHub Summary Without Building a Dashboard

You don't need to build a custom tool to get useful information from GitHub. Here are your options, from simplest to most automated.

### Option 1: Manual GitHub Review (10-15 Minutes)

Every Monday, open your org's GitHub and look at:
1. **Merged PRs** in the last week (filter by merged date)
2. **Open PRs** sorted by oldest first (spot the stuck ones)
3. **Review requests** that are pending (spot the bottleneck)

This works for teams of 3-4 people. Beyond that, it gets tedious.

### Option 2: GitHub's Built-in Insights

GitHub's "Insights" tab on each repo gives you pulse data — PRs opened, merged, issues closed. It's limited (per-repo, not per-team) and doesn't surface stuck work, but it's free and already there.

### Option 3: Simple Scripting

Write a script that queries the GitHub API for merged PRs, open PRs, and review status across your team's repos. The GitHub REST API is well-documented and a basic script takes a few hours to write. The downside: you'll spend more time maintaining it than you expect, and it gives you data without context.

### Option 4: Automated Team Summaries

Tools like Work Intel connect to your GitHub org and generate a weekly summary with per-person breakdowns, stuck PR detection, and team-level trends. Instead of querying data yourself, you get a summary that tells you what shipped, what's stuck, and what needs your attention. This is the right approach if you want the information without the maintenance burden.

## The Right Way to Use GitHub Data as a Manager

The goal isn't surveillance. The goal is to notice problems early enough that you can help, and to make sure good work doesn't go invisible.

Here are some principles:

**Use data to start conversations, not to evaluate.** "I noticed your PR has been open for 4 days — is something blocking you?" is helpful. "You only merged 2 PRs this week" is not.

**Track team trends, not individual snapshots.** A single week doesn't tell you much about any individual. But if your team's review turnaround time has been creeping up for a month, that's a real signal.

**Surface stuck work, not busy work.** The most valuable thing GitHub data can tell you is what's *not* moving. Active work takes care of itself. Stuck work festers quietly.

**Share the data with the team.** Don't keep GitHub summaries as a management-only tool. When the whole team can see what shipped and what's stuck, peer accountability improves naturally. People start reviewing PRs faster when they can see the queue.

**Automate what you can.** Time you spend assembling GitHub data is time you're not spending on the things only a manager can do — removing blockers, making decisions, coaching your team. If you're spending 30+ minutes a week on this, automate it.

## A Healthy Relationship With Engineering Data

Engineering managers need visibility. Engineers need autonomy. These aren't in conflict if you focus on the right data.

Track team-level shipping velocity. Watch for stuck work. Pay attention to review bottlenecks. Ignore commit counts, lines of code, and individual productivity metrics.

And if you want a GitHub summary without the manual work, Work Intel turns your GitHub org into a weekly team recap. One admin connects, the whole team gets visibility. Setup takes two minutes, and nobody feels like they're being watched — because the focus is on the work, not the workers.
