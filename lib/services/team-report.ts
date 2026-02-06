import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getServiceSupabase, WeeklyReportData } from '../supabase';
import { fetchTeamGitHubData, TeamGitHubData } from './team-github';

const TeamAISummarySchema = z.object({
  summary: z.string(),
  velocity: z.string(),
  keyHighlights: z.array(z.string()).max(5),
  needsAttention: z.array(z.object({
    type: z.enum(['stuck_pr', 'blocked_pr', 'unreviewed_pr']),
    title: z.string(),
    url: z.string(),
    repo: z.string(),
    author: z.string(),
    reason: z.string(),
  })),
  memberSummaries: z.array(z.object({
    githubUsername: z.string(),
    aiSummary: z.string(),
  })),
});

const TEAM_REPORT_SYSTEM_PROMPT = `You are an engineering manager's assistant. Analyze the team's weekly GitHub activity and produce a concise summary.

GUIDELINES:
1. Summarize what the team shipped, what's in flight, and what needs attention
2. For velocity, describe trend qualitatively (e.g., "Strong week", "Moderate output", "Slow week - potential blockers")
3. Key highlights: top 3-5 notable items (big features merged, important reviews, etc.). If no notable items, return an empty array.
4. For needsAttention: only include PRs that are actually stuck. If none, return an empty array.
5. CRITICAL - memberSummaries: You MUST include an entry for EVERY member in the input data. Each entry needs:
   - githubUsername: exact username string from the input
   - aiSummary: 1-2 sentence summary (if no activity, say "No GitHub activity this week")

Return ONLY valid JSON with this exact structure:
{
  "summary": "string - team overview",
  "velocity": "string - qualitative assessment",
  "keyHighlights": ["string array - can be empty"],
  "needsAttention": [{"type": "stuck_pr|blocked_pr|unreviewed_pr", "title": "string", "url": "string", "repo": "string", "author": "string", "reason": "string"}],
  "memberSummaries": [{"githubUsername": "exact username from input", "aiSummary": "string"}]
}`;

export async function generateWeeklyReport(teamId: string): Promise<WeeklyReportData> {
  // 1. Fetch GitHub data
  const githubData = await fetchTeamGitHubData(teamId);

  // 2. Build condensed context for Claude
  const context = buildTeamContext(githubData);

  // 3. Get AI analysis
  const aiResult = await getAIAnalysis(context);

  // 4. Merge AI output with raw metrics
  const report = buildReport(githubData, aiResult);

  // 4b. Propagate rate limit info if present
  if (githubData.rateLimitInfo) {
    report.rateLimitInfo = githubData.rateLimitInfo;
  }

  // 5. Save to database
  await saveWeeklyReport(teamId, report);

  return report;
}

function buildTeamContext(data: TeamGitHubData) {
  return {
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
}

async function getAIAnalysis(context: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0.2,
    system: TEAM_REPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this team's weekly GitHub activity:\n\n${JSON.stringify(context, null, 2)}\n\nReturn ONLY valid JSON.`,
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
  aiResult: z.infer<typeof TeamAISummarySchema>
): WeeklyReportData {
  const totalPRsMerged = githubData.members.reduce((sum, m) => sum + m.mergedPRs.length, 0);
  const totalPRsOpen = githubData.members.reduce((sum, m) => sum + m.openPRs.length, 0);

  return {
    teamSummary: {
      totalPRsMerged,
      totalPRsOpen,
      stuckPRsCount: githubData.stuckPRs.length,
      summary: aiResult.summary,
      velocity: aiResult.velocity,
      keyHighlights: aiResult.keyHighlights,
    },
    needsAttention: aiResult.needsAttention.map(item => ({
      ...item,
      daysSinceUpdate: githubData.stuckPRs.find(p => p.url === item.url)?.daysSinceUpdate || 0,
    })),
    memberSummaries: githubData.members.map(member => {
      const aiSummary = aiResult.memberSummaries.find(
        s => s.githubUsername === member.githubUsername
      )?.aiSummary || '';

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
        aiSummary,
      };
    }),
  };
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
