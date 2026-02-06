import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';
import { revokeGitHubIntegration } from '@/lib/services/github-oauth';
import { auditLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await req.json();
    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Only team admins can disconnect GitHub' }, { status: 403 });
    }

    await revokeGitHubIntegration(teamId);

    auditLog('team.github.oauth_disconnected', { teamId, disconnectedBy: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[GitHub Disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
  }
}
