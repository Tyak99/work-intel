import { NextResponse } from 'next/server';
import {
  getTeamsWithGitHubIntegration,
  sendWeeklyReportsForTeam,
  TeamEmailSummary,
} from '@/lib/services/email';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for processing all teams

function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured, denying request');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  // Verify cron authentication
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results: TeamEmailSummary[] = [];
  const errors: Array<{ teamId: string; error: string }> = [];

  try {
    // 1. Get all teams with GitHub integration
    const teams = await getTeamsWithGitHubIntegration();

    if (teams.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No teams with GitHub integration found',
        teams: 0,
        emailsSent: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`Processing weekly reports for ${teams.length} teams`);

    // 2. Process each team
    for (const team of teams) {
      try {
        console.log(`Processing team: ${team.teamName} (${team.teamId})`);
        const summary = await sendWeeklyReportsForTeam(team.teamId);
        results.push(summary);
        console.log(
          `Team ${team.teamName}: ${summary.emailsSent}/${summary.totalMembers} emails sent`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to process team ${team.teamId}:`, errorMessage);
        errors.push({ teamId: team.teamId, error: errorMessage });
      }

      // Small delay between teams to avoid overwhelming the email service
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalEmailsSent = results.reduce((sum, r) => sum + r.emailsSent, 0);
    const totalEmailsFailed = results.reduce((sum, r) => sum + r.emailsFailed, 0);

    return NextResponse.json({
      success: true,
      teams: teams.length,
      teamsProcessed: results.length,
      teamsFailed: errors.length,
      emailsSent: totalEmailsSent,
      emailsFailed: totalEmailsFailed,
      duration: Date.now() - startTime,
      results: results.map(r => ({
        teamId: r.teamId,
        teamName: r.teamName,
        members: r.totalMembers,
        sent: r.emailsSent,
        failed: r.emailsFailed,
        emailResults: r.results,
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Weekly reports cron failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
