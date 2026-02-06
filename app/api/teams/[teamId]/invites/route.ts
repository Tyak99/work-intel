import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin, getTeamById } from '@/lib/services/team-auth';
import { sendTeamInviteEmail } from '@/lib/services/email';
import { getServiceSupabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
  github_username: z.string().optional(),
});

// GET /api/teams/[teamId]/invites - List pending invites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await params;

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { data, error } = await getServiceSupabase()
      .from('team_invites')
      .select(`
        id,
        email,
        role,
        github_username,
        created_at,
        last_sent_at,
        expires_at,
        invited_by,
        users:invited_by(display_name, email)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing invites:', error);
      return NextResponse.json({ error: 'Failed to list invites' }, { status: 500 });
    }

    return NextResponse.json({ invites: data || [] });
  } catch (error) {
    console.error('Error listing invites:', error);
    return NextResponse.json({ error: 'Failed to list invites' }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/invites - Send invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await params;

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Rate limit: 10 invites per hour per team
    const rl = rateLimit(`invite:${teamId}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many invites. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await req.json();
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { email, role: validRole, github_username } = parsed.data;

    // Get team details for email
    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a team member
    const { data: existingUser } = await getServiceSupabase()
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const { data: existingMember } = await getServiceSupabase()
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 409 });
      }
    }

    // Check if invite already exists (upsert)
    const { data: existingInvite } = await getServiceSupabase()
      .from('team_invites')
      .select('id, token')
      .eq('team_id', teamId)
      .eq('email', email)
      .single();

    const inviterName = user.displayName || user.email;

    if (existingInvite) {
      // Update existing invite (reset expiry on resend)
      const { data: updatedInvite, error: updateError } = await getServiceSupabase()
        .from('team_invites')
        .update({
          role: validRole,
          github_username: github_username || null,
          last_sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvite.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating invite:', updateError);
        return NextResponse.json({ error: 'Failed to update invite' }, { status: 500 });
      }

      // Resend email
      const emailResult = await sendTeamInviteEmail(
        email,
        team.name,
        inviterName,
        validRole,
        existingInvite.token
      );

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error);
      }

      return NextResponse.json({
        invite: updatedInvite,
        message: 'Invite updated and resent',
      });
    }

    // Create new invite
    const token = crypto.randomBytes(32).toString('hex');

    const { data: invite, error: insertError } = await getServiceSupabase()
      .from('team_invites')
      .insert({
        team_id: teamId,
        email,
        role: validRole,
        github_username: github_username || null,
        token,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Send email
    const emailResult = await sendTeamInviteEmail(
      email,
      team.name,
      inviterName,
      validRole,
      token
    );

    if (!emailResult.success) {
      console.error('Failed to send invite email:', emailResult.error);
    }

    return NextResponse.json({ invite, emailSent: emailResult.success }, { status: 201 });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
