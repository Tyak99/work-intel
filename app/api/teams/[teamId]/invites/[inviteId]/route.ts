import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { auditLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// DELETE /api/teams/[teamId]/invites/[inviteId] - Revoke invite
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId, inviteId } = await params;

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verify invite belongs to team
    const { data: invite } = await getServiceSupabase()
      .from('team_invites')
      .select('id')
      .eq('id', inviteId)
      .eq('team_id', teamId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const { error } = await getServiceSupabase()
      .from('team_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      console.error('Error revoking invite:', error);
      return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
    }

    auditLog('team.invite.revoked', { teamId, inviteId, revokedBy: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invite:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
