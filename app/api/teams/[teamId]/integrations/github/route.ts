import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/utils/encryption';
import { Octokit } from '@octokit/rest';

export const dynamic = 'force-dynamic';

// POST /api/teams/[teamId]/integrations/github - Connect GitHub
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

    const { token, org } = await req.json();
    if (!token || !org) {
      return NextResponse.json({ error: 'GitHub token and organization are required' }, { status: 400 });
    }

    // Test the token
    try {
      const octokit = new Octokit({ auth: token });
      const { data: orgData } = await octokit.rest.orgs.get({ org });
      if (!orgData) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
      }
    } catch (err: any) {
      return NextResponse.json({ error: `GitHub token validation failed: ${err.message}` }, { status: 400 });
    }

    // Encrypt and store
    const encryptedToken = encrypt(token);

    const { data, error } = await supabase
      .from('team_integrations')
      .upsert({
        team_id: teamId,
        provider: 'github',
        config: { org, encrypted_token: encryptedToken },
        connected_by: user.id,
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'team_id,provider',
      })
      .select()
      .single();

    if (error) {
      console.error('Error connecting GitHub:', error);
      return NextResponse.json({ error: 'Failed to connect GitHub' }, { status: 500 });
    }

    return NextResponse.json({ integration: { id: data.id, provider: 'github', org } });
  } catch (error) {
    console.error('Error connecting GitHub:', error);
    return NextResponse.json({ error: 'Failed to connect GitHub' }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/integrations/github - Disconnect GitHub
export async function DELETE(
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

    const { error } = await supabase
      .from('team_integrations')
      .delete()
      .eq('team_id', teamId)
      .eq('provider', 'github');

    if (error) {
      return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
  }
}
