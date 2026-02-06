import { getValidAccessToken, getJiraIntegrationConfig } from './atlassian-oauth';
import { cache } from '../cache';

const ATLASSIAN_API_URL = 'https://api.atlassian.com';

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: 'new' | 'indeterminate' | 'done';
  issueType: string;
  priority: string;
  assignee: string | null;
  assigneeAccountId: string | null;
  reporter: string;
  created: string;
  updated: string;
  url: string;
  storyPoints?: number;
  labels: string[];
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
  active: boolean;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface JiraSprintData {
  projectKey: string;
  projectName: string;
  siteUrl: string;
  currentSprint: JiraSprint | null;
  sprintIssues: JiraIssue[];
  recentlyCompleted: JiraIssue[];
  blockedIssues: JiraIssue[];
  fetchedAt: string;
}

export interface TeamJiraData {
  sprintData: JiraSprintData | null;
  /** Data for all configured projects (when multiple) */
  allProjectsData: JiraSprintData[];
  memberAssignments: Array<{
    assignee: string;
    assigneeAccountId: string | null;
    issues: JiraIssue[];
    completedThisWeek: number;
    inProgress: number;
  }>;
  fetchedAt: string;
}

/**
 * Fetch team Jira data using OAuth tokens
 */
export async function fetchTeamJiraData(teamId: string): Promise<TeamJiraData | null> {
  const cacheKey = `team-jira:${teamId}`;
  const cached = cache.get<TeamJiraData>(cacheKey);
  if (cached) return cached;

  // Get valid access token (auto-refreshes if expired)
  const accessToken = await getValidAccessToken(teamId);
  if (!accessToken) {
    console.error('[TeamJira] No valid access token for team:', teamId);
    return null;
  }

  // Get integration config for cloud_id and project_key
  const config = await getJiraIntegrationConfig(teamId);
  if (!config) {
    console.error('[TeamJira] No Jira integration config for team:', teamId);
    return null;
  }

  const projectKeys = config.project_keys || (config.project_key ? [config.project_key] : []);
  if (projectKeys.length === 0) {
    console.error('[TeamJira] No project keys configured for team:', teamId);
    return null;
  }

  try {
    // Fetch data for all configured projects in parallel
    const allProjectsData = await Promise.all(
      projectKeys.map(key =>
        fetchSprintData(accessToken, config.cloud_id, key, config.site_url)
      )
    );

    // Merge sprint issues and completed issues across all projects for member assignments
    const mergedSprintData: JiraSprintData = {
      ...allProjectsData[0],
      sprintIssues: allProjectsData.flatMap(d => d.sprintIssues),
      recentlyCompleted: allProjectsData.flatMap(d => d.recentlyCompleted),
      blockedIssues: allProjectsData.flatMap(d => d.blockedIssues),
    };

    // Group issues by assignee across all projects
    const memberAssignments = groupIssuesByAssignee(mergedSprintData);

    const result: TeamJiraData = {
      sprintData: allProjectsData[0], // primary project for backward compat
      allProjectsData,
      memberAssignments,
      fetchedAt: new Date().toISOString(),
    };

    // Cache for 15 minutes
    cache.set(cacheKey, result, 15 * 60 * 1000);

    return result;
  } catch (error) {
    console.error('[TeamJira] Error fetching Jira data:', error);
    return null;
  }
}

/**
 * Fetch sprint data for a project
 */
async function fetchSprintData(
  accessToken: string,
  cloudId: string,
  projectKey: string,
  siteUrl: string
): Promise<JiraSprintData> {
  const baseUrl = `${ATLASSIAN_API_URL}/ex/jira/${cloudId}`;

  // Get project info
  const projectResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!projectResponse.ok) {
    throw new Error(`Failed to fetch project: ${projectResponse.status}`);
  }

  const project = await projectResponse.json();

  // Try to find an active sprint via board
  let currentSprint: JiraSprint | null = null;
  let sprintIssues: JiraIssue[] = [];

  try {
    // Get boards for this project
    const boardsResponse = await fetch(
      `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (boardsResponse.ok) {
      const boardsData = await boardsResponse.json();
      const boards = boardsData.values || [];

      // Find a scrum board (has sprints)
      const scrumBoard = boards.find((b: any) => b.type === 'scrum');

      if (scrumBoard) {
        // Get active sprint
        const sprintsResponse = await fetch(
          `${baseUrl}/rest/agile/1.0/board/${scrumBoard.id}/sprint?state=active`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (sprintsResponse.ok) {
          const sprintsData = await sprintsResponse.json();
          const activeSprint = (sprintsData.values || [])[0];

          if (activeSprint) {
            currentSprint = {
              id: activeSprint.id,
              name: activeSprint.name,
              state: activeSprint.state,
              startDate: activeSprint.startDate,
              endDate: activeSprint.endDate,
              goal: activeSprint.goal,
            };

            // Get issues in the sprint
            const sprintIssuesResponse = await fetch(
              `${baseUrl}/rest/agile/1.0/sprint/${activeSprint.id}/issue?maxResults=100`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              }
            );

            if (sprintIssuesResponse.ok) {
              const issuesData = await sprintIssuesResponse.json();
              sprintIssues = (issuesData.issues || []).map((issue: any) =>
                mapJiraIssue(issue, siteUrl)
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[TeamJira] Error fetching sprint data:', error);
  }

  // If no sprint, fetch recent issues using JQL
  if (sprintIssues.length === 0) {
    try {
      const jql = encodeURIComponent(
        `project = ${projectKey} AND updated >= -7d ORDER BY updated DESC`
      );
      const searchResponse = await fetch(
        `${baseUrl}/rest/api/3/search?jql=${jql}&maxResults=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        sprintIssues = (searchData.issues || []).map((issue: any) =>
          mapJiraIssue(issue, siteUrl)
        );
      }
    } catch (error) {
      console.error('[TeamJira] Error fetching issues via JQL:', error);
    }
  }

  // Get recently completed issues (last 7 days)
  let recentlyCompleted: JiraIssue[] = [];
  try {
    const jql = encodeURIComponent(
      `project = ${projectKey} AND status changed to Done AFTER -7d ORDER BY updated DESC`
    );
    const completedResponse = await fetch(
      `${baseUrl}/rest/api/3/search?jql=${jql}&maxResults=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (completedResponse.ok) {
      const completedData = await completedResponse.json();
      recentlyCompleted = (completedData.issues || []).map((issue: any) =>
        mapJiraIssue(issue, siteUrl)
      );
    }
  } catch (error) {
    console.error('[TeamJira] Error fetching completed issues:', error);
  }

  // Identify blocked issues
  const blockedIssues = sprintIssues.filter(
    (issue) =>
      issue.labels.includes('blocked') ||
      issue.status.toLowerCase().includes('blocked') ||
      issue.status.toLowerCase().includes('impediment')
  );

  return {
    projectKey,
    projectName: project.name,
    siteUrl,
    currentSprint,
    sprintIssues,
    recentlyCompleted,
    blockedIssues,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Map Jira API issue to our interface
 */
function mapJiraIssue(issue: any, siteUrl: string): JiraIssue {
  const fields = issue.fields || {};

  return {
    key: issue.key,
    summary: fields.summary || '',
    status: fields.status?.name || 'Unknown',
    statusCategory: mapStatusCategory(fields.status?.statusCategory?.key),
    issueType: fields.issuetype?.name || 'Unknown',
    priority: fields.priority?.name || 'Medium',
    assignee: fields.assignee?.displayName || null,
    assigneeAccountId: fields.assignee?.accountId || null,
    reporter: fields.reporter?.displayName || 'Unknown',
    created: fields.created,
    updated: fields.updated,
    url: `${siteUrl}/browse/${issue.key}`,
    storyPoints: fields.customfield_10016, // Common story points field, may vary
    labels: fields.labels || [],
  };
}

/**
 * Map Jira status category to our enum
 */
function mapStatusCategory(key: string | undefined): 'new' | 'indeterminate' | 'done' {
  switch (key) {
    case 'new':
      return 'new';
    case 'done':
      return 'done';
    default:
      return 'indeterminate';
  }
}

/**
 * Group issues by assignee accountId for member summaries.
 * Uses accountId as the key for reliable matching to team members.
 */
function groupIssuesByAssignee(sprintData: JiraSprintData): TeamJiraData['memberAssignments'] {
  // Key by accountId when available, fall back to display name for unassigned
  const assigneeMap = new Map<string, { displayName: string; accountId: string | null; issues: JiraIssue[] }>();

  for (const issue of sprintData.sprintIssues) {
    const key = issue.assigneeAccountId || issue.assignee || 'Unassigned';
    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, {
        displayName: issue.assignee || 'Unassigned',
        accountId: issue.assigneeAccountId,
        issues: [],
      });
    }
    assigneeMap.get(key)!.issues.push(issue);
  }

  return Array.from(assigneeMap.values()).map(({ displayName, accountId, issues }) => ({
    assignee: displayName,
    assigneeAccountId: accountId,
    issues,
    completedThisWeek: sprintData.recentlyCompleted.filter(
      (i) => (accountId ? i.assigneeAccountId === accountId : i.assignee === displayName)
    ).length,
    inProgress: issues.filter((i) => i.statusCategory === 'indeterminate').length,
  }));
}

/**
 * Check if Jira is connected and configured for a team
 */
export async function isJiraConfigured(teamId: string): Promise<boolean> {
  const config = await getJiraIntegrationConfig(teamId);
  return config !== null && ((config.project_keys?.length ?? 0) > 0 || !!config.project_key);
}

/**
 * Fetch assignable Jira users for the team's configured projects.
 * Uses the multiProjectSearch endpoint to get all users who can be assigned issues.
 */
export async function fetchAssignableJiraUsers(teamId: string): Promise<JiraUser[]> {
  const accessToken = await getValidAccessToken(teamId);
  if (!accessToken) {
    throw new Error('No valid Jira access token');
  }

  const config = await getJiraIntegrationConfig(teamId);
  if (!config) {
    throw new Error('Jira not configured');
  }

  const projectKeys = config.project_keys || (config.project_key ? [config.project_key] : []);
  if (projectKeys.length === 0) {
    throw new Error('No Jira projects configured');
  }

  const baseUrl = `${ATLASSIAN_API_URL}/ex/jira/${config.cloud_id}`;
  const queryParam = projectKeys.join(',');

  const response = await fetch(
    `${baseUrl}/rest/api/3/user/assignable/multiProjectSearch?projectKeys=${encodeURIComponent(queryParam)}&maxResults=200`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('[TeamJira] Failed to fetch assignable users:', error);
    throw new Error(`Failed to fetch Jira users: ${response.status}`);
  }

  const users: any[] = await response.json();

  return users
    .filter((u: any) => u.accountType === 'atlassian' && u.active)
    .map((u: any) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress,
      avatarUrl: u.avatarUrls?.['48x48'],
      active: u.active,
    }));
}

/**
 * Test Jira connection for a team
 */
export async function testJiraConnection(teamId: string): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(teamId);
    if (!accessToken) {
      return false;
    }

    const config = await getJiraIntegrationConfig(teamId);
    if (!config) {
      return false;
    }

    // Try to fetch the project
    const response = await fetch(
      `${ATLASSIAN_API_URL}/ex/jira/${config.cloud_id}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[TeamJira] Connection test failed:', error);
    return false;
  }
}
