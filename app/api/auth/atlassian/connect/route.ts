import { NextRequest, NextResponse } from 'next/server';
import { buildAtlassianAuthUrl } from '@/lib/services/atlassian-oauth';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';

export async function GET(req: NextRequest) {
  try {
    // Get teamId from query params
    const teamId = req.nextUrl.searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId parameter' },
        { status: 400 }
      );
    }

    // Get user from session - must be authenticated
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      );
    }

    // Verify user is team admin
    try {
      await requireTeamAdmin(teamId, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: 'Only team admins can connect Jira' },
        { status: 403 }
      );
    }

    const authUrl = await buildAtlassianAuthUrl(teamId, user.id);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[Atlassian Connect] Error building auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Jira authentication' },
      { status: 500 }
    );
  }
}
