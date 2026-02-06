import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamMembership } from '@/lib/services/team-auth';
import { getServiceSupabase, WeeklyReportData } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface TrendMetrics {
  prsMerged: number;
  prsOpen: number;
  reviews: number;
  commits: number;
  stuckPRs: number;
}

export interface TrendWeek {
  weekStart: string;
  metrics: TrendMetrics;
}

function extractMetrics(reportData: WeeklyReportData): TrendMetrics {
  const totalReviews = reportData.memberSummaries.reduce(
    (sum, m) => sum + m.reviewActivity,
    0
  );
  const totalCommits = reportData.memberSummaries.reduce(
    (sum, m) => sum + m.commitCount,
    0
  );

  return {
    prsMerged: reportData.teamSummary.totalPRsMerged,
    prsOpen: reportData.teamSummary.totalPRsOpen,
    reviews: totalReviews,
    commits: totalCommits,
    stuckPRs: reportData.teamSummary.stuckPRsCount,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await params;

    try {
      await requireTeamMembership(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await getServiceSupabase()
      .from('weekly_reports')
      .select('week_start, report_data')
      .eq('team_id', teamId)
      .order('week_start', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching trend data:', error);
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ weeks: [] });
    }

    const weeks: TrendWeek[] = data
      .map((row) => ({
        weekStart: row.week_start,
        metrics: extractMetrics(row.report_data as WeeklyReportData),
      }))
      .reverse(); // chronological order (oldest first)

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
