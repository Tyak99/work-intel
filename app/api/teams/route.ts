import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/teams - Create a team
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Team name must be at least 2 characters' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check slug uniqueness
    const { data: existing } = await supabase.from('teams').select('id').eq('slug', slug).single();
    if (existing) {
      return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 });
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: name.trim(), slug, created_by: user.id })
      .select()
      .single();

    if (teamError || !team) {
      console.error('Error creating team:', teamError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'admin' });

    if (memberError) {
      console.error('Error adding creator as admin:', memberError);
      // Clean up team if member insert fails
      await supabase.from('teams').delete().eq('id', team.id);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: memberships, error } = await supabase
      .from('team_members')
      .select('team_id, role, teams(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error listing teams:', error);
      return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 });
    }

    const teams = (memberships || []).map(m => ({
      ...m.teams,
      role: m.role,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error listing teams:', error);
    return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 });
  }
}
