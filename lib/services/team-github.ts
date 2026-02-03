import { Octokit } from '@octokit/rest';
import { supabase } from '../supabase';
import { decrypt } from '../utils/encryption';
import { cache } from '../cache';

export interface MemberGitHubData {
  githubUsername: string;
  mergedPRs: Array<{
    title: string;
    url: string;
    repo: string;
    merged_at: string;
  }>;
  openPRs: Array<{
    title: string;
    url: string;
    repo: string;
    created_at: string;
    updated_at: string;
    reviewers: string[];
    review_state: string | null;
  }>;
  reviewsGiven: number;
  commitCount: number;
}

export interface TeamGitHubData {
  org: string;
  members: MemberGitHubData[];
  stuckPRs: Array<{
    title: string;
    url: string;
    repo: string;
    author: string;
    daysSinceUpdate: number;
    reason: string;
  }>;
  fetchedAt: string;
}

export async function fetchTeamGitHubData(teamId: string): Promise<TeamGitHubData> {
  const cacheKey = `team-github:${teamId}`;
  const cached = cache.get<TeamGitHubData>(cacheKey);
  if (cached) return cached;

  // Get GitHub integration config
  const { data: integration, error: intError } = await supabase
    .from('team_integrations')
    .select('config')
    .eq('team_id', teamId)
    .eq('provider', 'github')
    .single();

  if (intError || !integration) {
    throw new Error('GitHub integration not configured for this team');
  }

  const { org, encrypted_token } = integration.config as { org: string; encrypted_token: string };
  const token = decrypt(encrypted_token);
  const octokit = new Octokit({ auth: token });

  // Get team members with github usernames
  const { data: members } = await supabase
    .from('team_members')
    .select('github_username')
    .eq('team_id', teamId)
    .not('github_username', 'is', null);

  const githubUsernames = (members || [])
    .map(m => m.github_username)
    .filter((u): u is string => !!u);

  if (githubUsernames.length === 0) {
    throw new Error('No team members have GitHub usernames configured');
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString().split('T')[0];

  // Fetch data per member with concurrency limit of 3
  const memberDataResults: MemberGitHubData[] = [];
  const chunks = chunkArray(githubUsernames, 3);

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(username => fetchMemberData(octokit, username, org, weekAgoISO))
    );
    memberDataResults.push(...results);
  }

  // Classify stuck PRs across all members
  const stuckPRs: TeamGitHubData['stuckPRs'] = [];
  const now = new Date();

  for (const member of memberDataResults) {
    for (const pr of member.openPRs) {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate >= 3 && pr.reviewers.length === 0) {
        stuckPRs.push({
          title: pr.title,
          url: pr.url,
          repo: pr.repo,
          author: member.githubUsername,
          daysSinceUpdate,
          reason: 'No reviewers assigned, open for 3+ days',
        });
      } else if (pr.review_state === 'CHANGES_REQUESTED' && daysSinceUpdate >= 2) {
        stuckPRs.push({
          title: pr.title,
          url: pr.url,
          repo: pr.repo,
          author: member.githubUsername,
          daysSinceUpdate,
          reason: 'Changes requested, no update for 2+ days',
        });
      }
    }
  }

  const result: TeamGitHubData = {
    org,
    members: memberDataResults,
    stuckPRs,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, 15 * 60 * 1000);
  return result;
}

async function fetchMemberData(
  octokit: Octokit,
  username: string,
  org: string,
  weekAgoISO: string
): Promise<MemberGitHubData> {
  try {
    const [mergedResult, openResult, reviewResult, commitResult] = await Promise.all([
      // Merged PRs in the past week
      octokit.rest.search.issuesAndPullRequests({
        q: `is:pr is:merged author:${username} org:${org} merged:>=${weekAgoISO}`,
        sort: 'updated',
        order: 'desc',
        per_page: 50,
      }),
      // Open PRs
      octokit.rest.search.issuesAndPullRequests({
        q: `is:pr is:open author:${username} org:${org}`,
        sort: 'updated',
        order: 'desc',
        per_page: 20,
      }),
      // Reviews given
      octokit.rest.search.issuesAndPullRequests({
        q: `is:pr reviewed-by:${username} org:${org} updated:>=${weekAgoISO}`,
        sort: 'updated',
        per_page: 1,
      }),
      // Commits
      octokit.rest.search.commits({
        q: `author:${username} org:${org} committer-date:>=${weekAgoISO}`,
        per_page: 1,
      }),
    ]);

    const mergedPRs = mergedResult.data.items.map(pr => ({
      title: pr.title,
      url: pr.html_url,
      repo: pr.repository_url.split('/').pop() || '',
      merged_at: (pr as any).pull_request?.merged_at || pr.updated_at,
    }));

    const openPRs = openResult.data.items.map(pr => ({
      title: pr.title,
      url: pr.html_url,
      repo: pr.repository_url.split('/').pop() || '',
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      reviewers: ((pr as any).requested_reviewers || []).map((r: any) => r?.login || ''),
      review_state: null as string | null,
    }));

    return {
      githubUsername: username,
      mergedPRs,
      openPRs,
      reviewsGiven: reviewResult.data.total_count,
      commitCount: commitResult.data.total_count,
    };
  } catch (error) {
    console.error(`Error fetching GitHub data for ${username}:`, error);
    return {
      githubUsername: username,
      mergedPRs: [],
      openPRs: [],
      reviewsGiven: 0,
      commitCount: 0,
    };
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
