import { NextRequest, NextResponse } from 'next/server';
import { revokeJiraIntegration } from '@/lib/services/atlassian-oauth';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json(
        { error: 'Missing teamId' },
        { status: 400 }
      );
    }

    // Verify user is team admin
    try {
      await requireTeamAdmin(teamId, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: 'Only team admins can disconnect Jira' },
        { status: 403 }
      );
    }

    await revokeJiraIntegration(teamId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Atlassian Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Jira' },
      { status: 500 }
    );
  }
}
