import { Octokit } from '@octokit/rest';
import { getServiceSupabase } from '../supabase';
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
  rateLimitInfo?: {
    isPartial: boolean;
    message: string;
  };
}

interface GitHubRateLimitState {
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
  isLimited: boolean;
}

function checkRateLimitHeaders(headers: Record<string, string | undefined>): GitHubRateLimitState {
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '999', 10);
  const resetAt = parseInt(headers['x-ratelimit-reset'] || '0', 10);
  const isLimited = remaining === 0;

  if (remaining < 10 && remaining > 0) {
    console.warn(`GitHub API rate limit low: ${remaining} requests remaining. Resets at ${new Date(resetAt * 1000).toISOString()}`);
  }

  return { remaining, resetAt, isLimited };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;

      if ((status === 403 || status === 429) && attempt < maxRetries) {
        // Check for rate limit reset header
        const resetAt = error?.response?.headers?.['x-ratelimit-reset'];
        let waitMs: number;

        if (resetAt) {
          const resetTime = parseInt(resetAt, 10) * 1000;
          waitMs = Math.min(resetTime - Date.now() + 1000, 60000); // Wait until reset, max 60s
          if (waitMs < 0) waitMs = 1000;
        } else {
          // Exponential backoff: 1s, 2s, 4s
          waitMs = Math.pow(2, attempt) * 1000;
        }

        console.warn(`GitHub API rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${Math.round(waitMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export async function fetchTeamGitHubData(teamId: string): Promise<TeamGitHubData> {
  const cacheKey = `team-github:${teamId}`;
  const cached = cache.get<TeamGitHubData>(cacheKey);
  if (cached) return cached;

  // Get GitHub integration config
  const { data: integration, error: intError } = await getServiceSupabase()
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
  const { data: members } = await getServiceSupabase()
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
  let wasRateLimited = false;

  for (const chunk of chunks) {
    // Check rate limit before each chunk
    try {
      const { headers } = await octokit.rest.rateLimit.get();
      const state = checkRateLimitHeaders(headers as Record<string, string | undefined>);
      if (state.isLimited) {
        console.warn(`GitHub API rate limit exhausted before fetching all members. Returning partial data.`);
        wasRateLimited = true;
        break;
      }
    } catch {
      // Rate limit check itself failed; continue with data fetch
    }

    const results = await Promise.all(
      chunk.map(username => fetchMemberData(octokit, username, org, weekAgoISO))
    );

    for (const r of results) {
      if (r.wasRateLimited) wasRateLimited = true;
      memberDataResults.push(r.data);
    }
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

  if (wasRateLimited) {
    result.rateLimitInfo = {
      isPartial: true,
      message: 'Some data may be missing due to GitHub API rate limits',
    };
  }

  cache.set(cacheKey, result, 15 * 60 * 1000);
  return result;
}

interface FetchMemberResult {
  data: MemberGitHubData;
  wasRateLimited: boolean;
}

async function fetchMemberData(
  octokit: Octokit,
  username: string,
  org: string,
  weekAgoISO: string
): Promise<FetchMemberResult> {
  let wasRateLimited = false;

  try {
    const [mergedResult, openResult, reviewResult, commitResult] = await Promise.all([
      // Merged PRs in the past week
      withRetry(() =>
        octokit.rest.search.issuesAndPullRequests({
          q: `is:pr is:merged author:${username} org:${org} merged:>=${weekAgoISO}`,
          sort: 'updated',
          order: 'desc',
          per_page: 50,
        })
      ),
      // Open PRs
      withRetry(() =>
        octokit.rest.search.issuesAndPullRequests({
          q: `is:pr is:open author:${username} org:${org}`,
          sort: 'updated',
          order: 'desc',
          per_page: 20,
        })
      ),
      // Reviews given
      withRetry(() =>
        octokit.rest.search.issuesAndPullRequests({
          q: `is:pr reviewed-by:${username} org:${org} updated:>=${weekAgoISO}`,
          sort: 'updated',
          per_page: 1,
        })
      ),
      // Commits
      withRetry(() =>
        octokit.rest.search.commits({
          q: `author:${username} org:${org} committer-date:>=${weekAgoISO}`,
          per_page: 1,
        })
      ),
    ]);

    // Check rate limit on the last response
    const headers = commitResult.headers as Record<string, string | undefined>;
    const state = checkRateLimitHeaders(headers);
    if (state.remaining < 10) {
      wasRateLimited = state.isLimited;
    }

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
      data: {
        githubUsername: username,
        mergedPRs,
        openPRs,
        reviewsGiven: reviewResult.data.total_count,
        commitCount: commitResult.data.total_count,
      },
      wasRateLimited,
    };
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    if (status === 403 || status === 429) {
      wasRateLimited = true;
    }
    console.error(`Error fetching GitHub data for ${username}:`, error);
    return {
      data: {
        githubUsername: username,
        mergedPRs: [],
        openPRs: [],
        reviewsGiven: 0,
        commitCount: 0,
      },
      wasRateLimited,
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
