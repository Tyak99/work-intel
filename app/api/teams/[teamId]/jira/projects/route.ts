import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamMembership } from '@/lib/services/team-auth';
import { getValidAccessToken, getJiraIntegrationConfig } from '@/lib/services/atlassian-oauth';

const ATLASSIAN_API_URL = 'https://api.atlassian.com';

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
  projectTypeKey: string;
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
    } catch (error) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get Jira integration config
    const config = await getJiraIntegrationConfig(teamId);
    if (!config) {
      return NextResponse.json(
        { error: 'Jira is not connected. Please connect Jira first.' },
        { status: 400 }
      );
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(teamId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Jira authentication expired. Please reconnect Jira.' },
        { status: 401 }
      );
    }

    // Fetch projects from Jira
    const response = await fetch(
      `${ATLASSIAN_API_URL}/ex/jira/${config.cloud_id}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Jira Projects] Failed to fetch projects:', error);
      return NextResponse.json(
        { error: `Failed to fetch Jira projects: ${error.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const projects = await response.json();

    const formattedProjects: JiraProject[] = projects.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.['48x48'],
      projectTypeKey: p.projectTypeKey,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('[Jira Projects] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Jira projects' },
      { status: 500 }
    );
  }
}
