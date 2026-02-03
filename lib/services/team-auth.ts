import { supabase, TeamRow, TeamMemberRow } from '../supabase';

export async function getTeamBySlug(slug: string): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getTeamById(teamId: string): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getTeamMembership(teamId: string, userId: string): Promise<TeamMemberRow | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function requireTeamMembership(teamId: string, userId: string): Promise<TeamMemberRow> {
  const membership = await getTeamMembership(teamId, userId);
  if (!membership) {
    throw new Error('FORBIDDEN: Not a team member');
  }
  return membership;
}

export async function requireTeamAdmin(teamId: string, userId: string): Promise<TeamMemberRow> {
  const membership = await getTeamMembership(teamId, userId);
  if (!membership || membership.role !== 'admin') {
    throw new Error('FORBIDDEN: Admin access required');
  }
  return membership;
}
