import { Octokit } from '@octokit/rest';
import { cache, cacheKeys } from '../cache';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function fetchGitHubData(username?: string, userId: string = 'user-1') {
  const cacheKey = cacheKeys.toolData(userId, 'github');
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    console.log('Using cached GitHub data');
    return cachedData;
  }

  try {
    const authenticatedUser = await octokit.rest.users.getAuthenticated();
    const actualUsername = username || authenticatedUser.data.login;

    // Get pull requests assigned to user or created by user
    const pullRequests = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:open involves:${actualUsername}`,
      sort: 'updated',
      order: 'desc',
      per_page: 20
    });

    // Get issues assigned to user
    const issues = await octokit.rest.search.issuesAndPullRequests({
      q: `is:issue is:open assignee:${actualUsername}`,
      sort: 'updated', 
      order: 'desc',
      per_page: 20
    });

    // Get review requests
    const reviewRequests = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:open review-requested:${actualUsername}`,
      sort: 'updated',
      order: 'desc', 
      per_page: 10
    });

    // Filter out PRs that have already been approved by the user
    const filteredReviewRequests = [];
    for (const pr of reviewRequests.data.items) {
      try {
        const [owner, repo] = pr.repository_url.split('/').slice(-2);
        const reviews = await octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: pr.number
        });
        
        // Check if the user has already approved this PR
        const userApproved = reviews.data.some(review => 
          review.user?.login === actualUsername && review.state === 'APPROVED'
        );
        
        if (!userApproved) {
          filteredReviewRequests.push(pr);
        }
      } catch (error) {
        // If we can't fetch reviews, include the PR to be safe
        console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
        filteredReviewRequests.push(pr);
      }
    }

    const result = {
      pullRequests: pullRequests.data.items.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        html_url: pr.html_url,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        repository: {
          name: pr.repository_url.split('/').pop(),
          full_name: pr.repository_url.split('/').slice(-2).join('/')
        },
        user: {
          login: pr.user?.login,
          avatar_url: pr.user?.avatar_url
        },
        labels: pr.labels,
        assignees: (pr.assignees as any)?.map((a: any) => a.login),
        draft: (pr as any).draft,
        mergeable: (pr as any).mergeable,
        requested_reviewers: (pr as any).requested_reviewers?.map((r: any) => r.login)
      })),
      issues: issues.data.items.map(issue => ({
        id: issue.id,
        number: issue.number, 
        title: issue.title,
        body: issue.body,
        html_url: issue.html_url,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        repository: {
          name: issue.repository_url.split('/').pop(),
          full_name: issue.repository_url.split('/').slice(-2).join('/')
        },
        user: {
          login: issue.user?.login,
          avatar_url: issue.user?.avatar_url
        },
        labels: issue.labels,
        assignees: (issue.assignees as any)?.map((a: any) => a.login)
      })),
      reviewRequests: filteredReviewRequests.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        repository: {
          name: pr.repository_url.split('/').pop(),
          full_name: pr.repository_url.split('/').slice(-2).join('/')
        },
        user: {
          login: pr.user?.login,
          avatar_url: pr.user?.avatar_url
        },
        labels: pr.labels
      }))
    };

    // Cache the result for 15 minutes
    cache.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw new Error('Failed to fetch GitHub data');
  }
}

export async function testGitHubConnection(): Promise<boolean> {
  try {
    await octokit.rest.users.getAuthenticated();
    return true;
  } catch (error) {
    console.error('GitHub connection test failed:', error);
    return false;
  }
}