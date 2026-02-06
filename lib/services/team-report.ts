import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getServiceSupabase, WeeklyReportData } from '../supabase';
import { fetchTeamGitHubData, TeamGitHubData } from './team-github';
import { fetchTeamJiraData, TeamJiraData } from './team-jira';

const TeamAISummarySchema = z.object({
  summary: z.string(),
  velocity: z.string(),
  keyHighlights: z.array(z.string()).max(5),
  jiraHighlights: z.array(z.string()).max(3).optional(),
  sprintHealth: z.object({
    sprintName: z.string(),
    progress: z.enum(['On track', 'At risk', 'Behind']),
    completionRate: z.string(),
    pointsCompleted: z.number().nullable(),
    pointsRemaining: z.number().nullable(),
    daysRemaining: z.number().nullable(),
    insight: z.string(),
  }).optional(),
  needsAttention: z.array(z.object({
    type: z.enum(['stuck_pr', 'blocked_pr', 'unreviewed_pr', 'blocked_issue', 'stale_issue']),
    title: z.string(),
    url: z.string(),
    repo: z.string(),
    author: z.string(),
    reason: z.string(),
  })),
  memberSummaries: z.array(z.object({
    githubUsername: z.string(),
    aiSummary: z.string(),
    jiraSummary: z.string().optional(),
  })),
});

function buildSystemPrompt(hasJira: boolean): string {
  const jiraGuidelines = hasJira ? `
6. JIRA ANALYSIS: When Jira data is present, analyze sprint health and cross-reference with GitHub:
   - sprintHealth: assess if the sprint is "On track", "At risk", or "Behind" based on completion rate and days remaining
   - jiraHighlights: top 1-3 notable Jira deliverables (big tickets closed, sprint goals hit). If nothing notable, return empty array.
   - For needsAttention: include "blocked_issue" for Jira issues flagged as blocked, "stale_issue" for in-progress issues with no recent updates (>5 days). Use the Jira issue URL for the url field and the project key for the repo field.
   - For memberSummaries.jiraSummary: 1 sentence about their Jira work (tickets closed, what's in progress). Skip if member has no Jira activity.
   - CROSS-REFERENCE: If you notice PRs merged but corresponding Jira tickets not moved, or Jira tickets done with no PRs, mention it in the summary.` : '';

  return `You are an engineering manager's assistant. Analyze the team's weekly activity and produce a concise summary.

GUIDELINES:
1. Summarize what the team shipped, what's in flight, and what needs attention
2. For velocity, describe trend qualitatively (e.g., "Strong week", "Moderate output", "Slow week - potential blockers")
3. Key highlights: top 3-5 notable items (big features merged, important reviews, etc.). If no notable items, return an empty array.
4. For needsAttention: only include items that genuinely need attention. If none, return an empty array.
5. CRITICAL - memberSummaries: You MUST include an entry for EVERY member in the input data. Each entry needs:
   - githubUsername: exact username string from the input
   - aiSummary: 1-2 sentence summary (if no activity, say "No GitHub activity this week")${jiraGuidelines}

Return ONLY valid JSON matching the required schema.`;
}

export async function generateWeeklyReport(teamId: string): Promise<WeeklyReportData> {
  // 1. Fetch GitHub and Jira data in parallel
  const [githubData, jiraData] = await Promise.all([
    fetchTeamGitHubData(teamId),
    fetchTeamJiraData(teamId).catch(err => {
      console.error('[TeamReport] Jira fetch failed, continuing without:', err);
      return null;
    }),
  ]);

  const hasJira = jiraData !== null;

  // 2. Build condensed context for Claude
  const context = buildTeamContext(githubData, jiraData);

  // 3. Get AI analysis
  const aiResult = await getAIAnalysis(context, hasJira);

  // 4. Merge AI output with raw metrics
  const report = buildReport(githubData, jiraData, aiResult);

  // 4b. Propagate rate limit info if present
  if (githubData.rateLimitInfo) {
    report.rateLimitInfo = githubData.rateLimitInfo;
  }

  // 5. Save to database
  await saveWeeklyReport(teamId, report);

  return report;
}

function buildTeamContext(data: TeamGitHubData, jiraData: TeamJiraData | null) {
  const context: Record<string, any> = {
    org: data.org,
    weekEnding: new Date().toISOString().split('T')[0],
    totalMembers: data.members.length,
    members: data.members.map(m => ({
      username: m.githubUsername,
      prsMerged: m.mergedPRs.length,
      mergedTitles: m.mergedPRs.slice(0, 5).map(pr => `${pr.title} (${pr.repo})`),
      prsOpen: m.openPRs.length,
      openTitles: m.openPRs.slice(0, 5).map(pr => `${pr.title} (${pr.repo})`),
      reviewsGiven: m.reviewsGiven,
      commits: m.commitCount,
    })),
    stuckPRs: data.stuckPRs.map(pr => ({
      title: pr.title,
      url: pr.url,
      repo: pr.repo,
      author: pr.author,
      daysSinceUpdate: pr.daysSinceUpdate,
      reason: pr.reason,
    })),
  };

  // Add Jira context if available
  if (jiraData) {
    const primarySprint = jiraData.sprintData?.currentSprint;
    const allCompleted = jiraData.allProjectsData.flatMap(p => p.recentlyCompleted);
    const allBlocked = jiraData.allProjectsData.flatMap(p => p.blockedIssues);
    const allSprintIssues = jiraData.allProjectsData.flatMap(p => p.sprintIssues);

    context.jira = {
      projects: jiraData.allProjectsData.map(p => p.projectKey),
      sprint: primarySprint ? {
        name: primarySprint.name,
        goal: primarySprint.goal || null,
        startDate: primarySprint.startDate || null,
        endDate: primarySprint.endDate || null,
        totalIssues: allSprintIssues.length,
        doneIssues: allSprintIssues.filter(i => i.statusCategory === 'done').length,
        inProgressIssues: allSprintIssues.filter(i => i.statusCategory === 'indeterminate').length,
        totalPoints: allSprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
        donePoints: allSprintIssues.filter(i => i.statusCategory === 'done').reduce((sum, i) => sum + (i.storyPoints || 0), 0),
      } : null,
      completedThisWeek: allCompleted.slice(0, 15).map(i => ({
        key: i.key,
        summary: i.summary,
        assignee: i.assignee,
        issueType: i.issueType,
        storyPoints: i.storyPoints || null,
      })),
      blockedIssues: allBlocked.map(i => ({
        key: i.key,
        summary: i.summary,
        assignee: i.assignee,
        url: i.url,
        daysSinceUpdate: Math.floor((Date.now() - new Date(i.updated).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      memberAssignments: jiraData.memberAssignments.map(ma => ({
        assignee: ma.assignee,
        completedThisWeek: ma.completedThisWeek,
        inProgress: ma.inProgress,
        issueKeys: ma.issues.slice(0, 5).map(i => `${i.key}: ${i.summary} (${i.status})`),
      })),
    };
  }

  return context;
}

async function getAIAnalysis(context: any, hasJira: boolean) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const anthropic = new Anthropic({ apiKey });

  const dataLabel = hasJira ? 'GitHub + Jira activity' : 'GitHub activity';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    temperature: 0.2,
    system: buildSystemPrompt(hasJira),
    messages: [
      {
        role: 'user',
        content: `Analyze this team's weekly ${dataLabel}:\n\n${JSON.stringify(context, null, 2)}\n\nReturn ONLY valid JSON.`,
      },
    ],
  });

  const rawText = response.content
    .filter(block => block.type === 'text')
    .map(block => ('text' in block ? block.text : ''))
    .join('\n');

  // Extract JSON from response
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;

  const parsed = JSON.parse(jsonStr.trim());
  return TeamAISummarySchema.parse(parsed);
}

function buildReport(
  githubData: TeamGitHubData,
  jiraData: TeamJiraData | null,
  aiResult: z.infer<typeof TeamAISummarySchema>
): WeeklyReportData {
  const totalPRsMerged = githubData.members.reduce((sum, m) => sum + m.mergedPRs.length, 0);
  const totalPRsOpen = githubData.members.reduce((sum, m) => sum + m.openPRs.length, 0);

  // Compute Jira totals from raw data
  const totalJiraCompleted = jiraData
    ? jiraData.allProjectsData.reduce((sum, p) => sum + p.recentlyCompleted.length, 0)
    : undefined;
  const totalJiraInProgress = jiraData
    ? jiraData.allProjectsData.reduce(
        (sum, p) => sum + p.sprintIssues.filter(i => i.statusCategory === 'indeterminate').length,
        0
      )
    : undefined;

  // Build per-member Jira lookup
  const jiraMemberMap = new Map<string, {
    completed: TeamJiraData['allProjectsData'][0]['recentlyCompleted'];
    inProgress: TeamJiraData['allProjectsData'][0]['sprintIssues'];
  }>();

  if (jiraData) {
    for (const ma of jiraData.memberAssignments) {
      const completedForMember = jiraData.allProjectsData
        .flatMap(p => p.recentlyCompleted)
        .filter(i => i.assignee === ma.assignee);
      const inProgressForMember = ma.issues.filter(i => i.statusCategory === 'indeterminate');
      jiraMemberMap.set(ma.assignee, { completed: completedForMember, inProgress: inProgressForMember });
    }
  }

  const report: WeeklyReportData = {
    teamSummary: {
      totalPRsMerged,
      totalPRsOpen,
      stuckPRsCount: githubData.stuckPRs.length,
      summary: aiResult.summary,
      velocity: aiResult.velocity,
      keyHighlights: aiResult.keyHighlights,
      ...(jiraData && {
        jiraHighlights: aiResult.jiraHighlights || [],
        totalJiraIssuesCompleted: totalJiraCompleted,
        totalJiraIssuesInProgress: totalJiraInProgress,
      }),
    },
    sprintHealth: aiResult.sprintHealth,
    needsAttention: aiResult.needsAttention.map(item => ({
      ...item,
      daysSinceUpdate:
        item.type === 'blocked_issue' || item.type === 'stale_issue'
          ? jiraData?.allProjectsData
              .flatMap(p => [...p.blockedIssues, ...p.sprintIssues])
              .find(i => i.url === item.url)
              ? Math.floor(
                  (Date.now() -
                    new Date(
                      jiraData!.allProjectsData
                        .flatMap(p => [...p.blockedIssues, ...p.sprintIssues])
                        .find(i => i.url === item.url)!.updated
                    ).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0
          : githubData.stuckPRs.find(p => p.url === item.url)?.daysSinceUpdate || 0,
    })),
    memberSummaries: githubData.members.map(member => {
      const aiSummary = aiResult.memberSummaries.find(
        s => s.githubUsername === member.githubUsername
      );

      // Try to find Jira data for this member by matching GitHub username to Jira display name
      // This is a best-effort match — Jira uses display names while we have GitHub usernames
      const memberJiraData = jiraMemberMap.get(member.githubUsername);

      return {
        githubUsername: member.githubUsername,
        shipped: member.mergedPRs.map(pr => ({
          title: pr.title,
          url: pr.url,
          repo: pr.repo,
        })),
        inFlight: member.openPRs.map(pr => ({
          title: pr.title,
          url: pr.url,
          repo: pr.repo,
          daysSinceUpdate: Math.floor(
            (Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
        reviewActivity: member.reviewsGiven,
        commitCount: member.commitCount,
        aiSummary: aiSummary?.aiSummary || '',
        ...(jiraData && {
          jiraSummary: aiSummary?.jiraSummary,
          jiraIssuesCompleted: memberJiraData?.completed.map(i => ({
            key: i.key,
            summary: i.summary,
            url: i.url,
            issueType: i.issueType,
          })),
          jiraIssuesInProgress: memberJiraData?.inProgress.map(i => ({
            key: i.key,
            summary: i.summary,
            url: i.url,
            issueType: i.issueType,
            storyPoints: i.storyPoints,
          })),
        }),
      };
    }),
    hasJiraData: jiraData !== null,
  };

  return report;
}

export async function saveWeeklyReport(teamId: string, report: WeeklyReportData): Promise<void> {
  // Calculate week start (Monday)
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { error } = await getServiceSupabase()
    .from('weekly_reports')
    .upsert({
      team_id: teamId,
      week_start: weekStartStr,
      report_data: report,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'team_id,week_start',
    });

  if (error) {
    console.error('Error saving weekly report:', error);
  }
}

export async function getLatestWeeklyReport(teamId: string): Promise<WeeklyReportData | null> {
  const { data, error } = await getServiceSupabase()
    .from('weekly_reports')
    .select('report_data')
    .eq('team_id', teamId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.report_data as WeeklyReportData;
}
