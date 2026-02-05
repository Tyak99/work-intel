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
  reporter: string;
  created: string;
  updated: string;
  url: string;
  storyPoints?: number;
  labels: string[];
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
  memberAssignments: Array<{
    assignee: string;
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

  if (!config.project_key) {
    console.error('[TeamJira] No project key configured for team:', teamId);
    return null;
  }

  try {
    const sprintData = await fetchSprintData(
      accessToken,
      config.cloud_id,
      config.project_key,
      config.site_url
    );

    // Group issues by assignee
    const memberAssignments = groupIssuesByAssignee(sprintData);

    const result: TeamJiraData = {
      sprintData,
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
 * Group issues by assignee for member summaries
 */
function groupIssuesByAssignee(sprintData: JiraSprintData): TeamJiraData['memberAssignments'] {
  const assigneeMap = new Map<string, JiraIssue[]>();

  // Group all sprint issues by assignee
  for (const issue of sprintData.sprintIssues) {
    const assignee = issue.assignee || 'Unassigned';
    if (!assigneeMap.has(assignee)) {
      assigneeMap.set(assignee, []);
    }
    assigneeMap.get(assignee)!.push(issue);
  }

  // Convert to array with stats
  return Array.from(assigneeMap.entries()).map(([assignee, issues]) => ({
    assignee,
    issues,
    completedThisWeek: sprintData.recentlyCompleted.filter(
      (i) => i.assignee === assignee
    ).length,
    inProgress: issues.filter((i) => i.statusCategory === 'indeterminate').length,
  }));
}

/**
 * Check if Jira is connected and configured for a team
 */
export async function isJiraConfigured(teamId: string): Promise<boolean> {
  const config = await getJiraIntegrationConfig(teamId);
  return config !== null && config.project_key !== undefined;
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
