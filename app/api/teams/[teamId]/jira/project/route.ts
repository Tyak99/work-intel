import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin, requireTeamMembership } from '@/lib/services/team-auth';
import { updateJiraProjectKey, getJiraIntegrationConfig } from '@/lib/services/atlassian-oauth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is team admin
    try {
      await requireTeamAdmin(teamId, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: 'Only team admins can set the Jira project' },
        { status: 403 }
      );
    }

    const body = await req.json();
    // Support both single projectKey and array projectKeys
    const projectKeys: string[] = body.projectKeys
      || (body.projectKey ? [body.projectKey] : []);

    if (projectKeys.length === 0 || !projectKeys.every((k: any) => typeof k === 'string')) {
      return NextResponse.json(
        { error: 'Missing or invalid projectKeys' },
        { status: 400 }
      );
    }

    // Verify Jira is connected
    const config = await getJiraIntegrationConfig(teamId);
    if (!config) {
      return NextResponse.json(
        { error: 'Jira is not connected. Please connect Jira first.' },
        { status: 400 }
      );
    }

    // Update the project keys
    await updateJiraProjectKey(teamId, projectKeys);

    return NextResponse.json({ success: true, projectKeys });
  } catch (error) {
    console.error('[Jira Project] Error setting project:', error);
    return NextResponse.json(
      { error: 'Failed to set Jira project' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify team membership
    try {
      await requireTeamMembership(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const config = await getJiraIntegrationConfig(teamId);
    if (!config) {
      return NextResponse.json({ projectKey: null });
    }

    return NextResponse.json({
      projectKey: config.project_key || null,
      projectKeys: config.project_keys || (config.project_key ? [config.project_key] : []),
    });
  } catch (error) {
    console.error('[Jira Project] Error getting project:', error);
    return NextResponse.json(
      { error: 'Failed to get Jira project' },
      { status: 500 }
    );
  }
}
