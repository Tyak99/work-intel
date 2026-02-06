import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin } from '@/lib/services/team-auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface MemberMapping {
  userId: string;
  jiraAccountId: string | null;
}

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const mappings = body.mappings;

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Invalid mappings format' }, { status: 400 });
    }

    // Validate each mapping entry
    for (const m of mappings) {
      if (typeof m.userId !== 'string' || !m.userId) {
        return NextResponse.json({ error: 'Invalid mapping: userId must be a non-empty string' }, { status: 400 });
      }
      if (m.jiraAccountId !== null && typeof m.jiraAccountId !== 'string') {
        return NextResponse.json({ error: 'Invalid mapping: jiraAccountId must be a string or null' }, { status: 400 });
      }
    }

    const validMappings: MemberMapping[] = mappings;

    const supabase = getServiceSupabase();

    // Update each team member's jira_account_id
    const results = await Promise.all(
      validMappings.map(async (mapping) => {
        const { error } = await supabase
          .from('team_members')
          .update({ jira_account_id: mapping.jiraAccountId })
          .eq('team_id', teamId)
          .eq('user_id', mapping.userId);

        if (error) {
          console.error(`[Jira Confirm] Error updating member ${mapping.userId}:`, error);
          return { userId: mapping.userId, success: false };
        }
        return { userId: mapping.userId, success: true };
      })
    );

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return NextResponse.json(
        { error: `Failed to update ${failures.length} member(s)`, results },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, updated: results.length });
  } catch (error) {
    console.error('[Jira Confirm Members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm Jira member mappings' },
      { status: 500 }
    );
  }
}
