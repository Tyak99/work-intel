import { NextRequest, NextResponse } from 'next/server';
import { createOAuthState, buildGitHubInstallUrl } from '@/lib/services/github-oauth';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get('teamId');
    const redirectTo = req.nextUrl.searchParams.get('redirectTo') as 'onboarding' | 'settings' | null;

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId parameter' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized — please login first' }, { status: 401 });
    }

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Only team admins can connect GitHub' }, { status: 403 });
    }

    const stateToken = await createOAuthState(teamId, user.id, redirectTo || undefined);
    const installUrl = buildGitHubInstallUrl(stateToken);

    return NextResponse.redirect(installUrl);
  } catch (error) {
    console.error('[GitHub Connect] Error building install URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub App installation' },
      { status: 500 }
    );
  }
}
