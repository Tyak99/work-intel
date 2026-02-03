import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamMembership } from '@/lib/services/team-auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/teams/[teamId] - Team details with members and integrations
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

    const [teamResult, membersResult, integrationsResult] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('team_members').select('*, users:user_id(id, email, display_name)').eq('team_id', teamId),
      supabase.from('team_integrations').select('*').eq('team_id', teamId),
    ]);

    if (teamResult.error || !teamResult.data) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      team: teamResult.data,
      members: membersResult.data || [],
      integrations: integrationsResult.data || [],
    });
  } catch (error) {
    console.error('Error getting team details:', error);
    return NextResponse.json({ error: 'Failed to get team details' }, { status: 500 });
  }
}
