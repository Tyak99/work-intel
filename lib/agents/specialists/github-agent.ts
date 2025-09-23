import { AgentExecutor } from '../executor';
import { AgentFindings, PriorityItem, ActionItem } from '../tools';

export class GitHubAgent {
  private executor: AgentExecutor;

  constructor(sessionId: string, userId: string) {
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async analyze(): Promise<AgentFindings> {
    const prompt = `You are a GitHub specialist agent for a senior software engineer. Your job is to analyze GitHub data and extract actionable insights.

INSTRUCTIONS:
1. Call fetch_github_data to get the latest GitHub information
2. Analyze the data focusing on:
   - Pull requests that need urgent attention (reviews, merges, conflicts)
   - Issues requiring immediate action (bugs, blockers, customer issues)
   - Review requests that are blocking others
   - Merge conflicts or failing CI/CD
   - Stale PRs that need attention
   - Security alerts or dependency updates

3. Identify priority items and action items:
   - Priority items: Things that block others or have deadlines
   - Action items: Concrete tasks you need to do (review PR, fix conflict, etc.)

4. Write your findings using write_findings tool

ANALYSIS FOCUS:
- Look for urgency signals: labels like "urgent", "hotfix", "critical"
- Check PR ages - older PRs may need attention
- Identify dependencies - what PRs depend on others
- Find review bottlenecks - PRs waiting for your review
- Spot failing builds or test issues
- Look for security/dependency alerts

OUTPUT STRUCTURE:
Your findings should include:
- summary: Brief overview of GitHub status
- priorityItems: Critical PRs/issues requiring immediate attention
- actionItems: Specific tasks to do today
- insights: Patterns, trends, or recommendations

Focus on actionable intelligence. Don't just summarize - provide insights about what needs attention and why.`;

    const response = await this.executor.executeAgent(prompt, [
      'fetch_github_data',
      'write_findings'
    ]);

    // Parse the session ID from the executor to read back the findings
    const sessionId = (this.executor as any).sessionId;

    // Read back the findings that were written
    const findings = await this.executor.executeAgent(
      `Read the GitHub findings that were just written using read_findings tool.`,
      ['read_findings']
    );

    try {
      // Try to extract JSON from the response
      const jsonMatch = findings.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse GitHub findings:', error);
    }

    // Fallback: create basic findings structure
    return {
      agentType: 'github',
      timestamp: new Date().toISOString(),
      summary: 'GitHub analysis completed',
      priorityItems: [],
      actionItems: [],
      insights: ['GitHub data processed by agent'],
      metadata: { sessionId }
    };
  }

  // Helper method to create a simple GitHub analysis without full agent execution
  static async quickAnalysis(githubData: any): Promise<AgentFindings> {
    const timestamp = new Date().toISOString();
    const priorityItems: PriorityItem[] = [];
    const actionItems: ActionItem[] = [];
    const insights: string[] = [];

    // Analyze pull requests
    if (githubData?.pullRequests) {
      githubData.pullRequests.forEach((pr: any) => {
        // High priority PRs
        if (pr.labels?.some((label: any) =>
          ['urgent', 'critical', 'hotfix', 'priority'].includes(label.name.toLowerCase())
        )) {
          priorityItems.push({
            id: `pr-${pr.number}`,
            title: `PR #${pr.number}: ${pr.title}`,
            description: `Critical PR requiring immediate attention: ${pr.body?.substring(0, 200) || ''}`,
            priority: 'critical',
            source: 'github',
            url: pr.html_url,
            deadline: pr.requested_reviewers?.length > 0 ? 'today' : undefined
          });
        }

        // Review requests
        if (pr.requested_reviewers?.length > 0) {
          actionItems.push({
            id: `review-${pr.number}`,
            title: `Review PR #${pr.number}`,
            description: `${pr.title} - requested review`,
            effort: 'medium',
            urgency: 'today'
          });
        }

        // Draft PRs that might need attention
        if (pr.draft && pr.updated_at) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceUpdate > 3) {
            insights.push(`Draft PR #${pr.number} hasn't been updated in ${daysSinceUpdate} days`);
          }
        }
      });
    }

    // Analyze issues
    if (githubData?.issues) {
      githubData.issues.forEach((issue: any) => {
        if (issue.labels?.some((label: any) =>
          ['bug', 'critical', 'production'].includes(label.name.toLowerCase())
        )) {
          priorityItems.push({
            id: `issue-${issue.number}`,
            title: `Issue #${issue.number}: ${issue.title}`,
            description: issue.body?.substring(0, 200) || '',
            priority: 'high',
            source: 'github',
            url: issue.html_url
          });
        }
      });
    }

    // Add insights about workload
    if (priorityItems.length > 5) {
      insights.push(`High GitHub workload: ${priorityItems.length} priority items need attention`);
    }

    if (actionItems.filter(item => item.urgency === 'today').length > 3) {
      insights.push('Consider prioritizing reviews to unblock team members');
    }

    return {
      agentType: 'github',
      timestamp,
      summary: `Found ${priorityItems.length} priority items and ${actionItems.length} action items`,
      priorityItems,
      actionItems,
      insights,
      metadata: {
        totalPRs: githubData?.pullRequests?.length || 0,
        totalIssues: githubData?.issues?.length || 0,
        reviewRequests: actionItems.filter(item => item.title.includes('Review')).length
      }
    };
  }
}