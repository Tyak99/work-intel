import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin, getTeamById } from '@/lib/services/team-auth';
import { sendTeamInviteEmail } from '@/lib/services/email';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/teams/[teamId]/invites/[inviteId]/resend - Resend invite email
export async function POST(
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

    // Get invite details
    const { data: invite, error: fetchError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('team_id', teamId)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Get team details
    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Send email
    const inviterName = user.displayName || user.email;
    const emailResult = await sendTeamInviteEmail(
      invite.email,
      team.name,
      inviterName,
      invite.role as 'admin' | 'member',
      invite.token
    );

    if (!emailResult.success) {
      console.error('Failed to resend invite email:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Update last_sent_at
    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (updateError) {
      console.error('Error updating last_sent_at:', updateError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resending invite:', error);
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
  }
}
