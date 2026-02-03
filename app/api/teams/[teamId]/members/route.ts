import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamMembership, requireTeamAdmin } from '@/lib/services/team-auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/teams/[teamId]/members
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

    const { data, error } = await supabase
      .from('team_members')
      .select('*, users:user_id(id, email, display_name)')
      .eq('team_id', teamId);

    if (error) {
      return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
    }

    return NextResponse.json({ members: data || [] });
  } catch (error) {
    console.error('Error listing members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/members - Add member by email
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

    const { email, role = 'member', github_username } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 409 });
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: targetUser.id,
        role: role === 'admin' ? 'admin' : 'member',
        github_username: github_username || null,
      })
      .select('*, users:user_id(id, email, display_name)')
      .single();

    if (error) {
      console.error('Error adding member:', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
