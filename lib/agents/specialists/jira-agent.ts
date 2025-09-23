import { AgentExecutor } from '../executor';
import { AgentFindings, PriorityItem, ActionItem } from '../tools';

export class JiraAgent {
  private executor: AgentExecutor;

  constructor(sessionId: string, userId: string) {
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async analyze(): Promise<AgentFindings> {
    const prompt = `You are a Jira specialist agent for a senior software engineer. Your job is to analyze Jira data and extract actionable insights.

INSTRUCTIONS:
1. Call fetch_jira_data to get the latest Jira information
2. Analyze the data focusing on:
   - Critical/high priority issues assigned to you
   - Tickets blocking other work or team members
   - Issues with approaching deadlines
   - Bugs in production or customer-facing issues
   - Stories/tasks ready for development
   - Issues waiting for your input or action

3. Identify priority items and action items:
   - Priority items: Critical bugs, blockers, high-impact items
   - Action items: Tickets you need to work on, update, or respond to

4. Write your findings using write_findings tool

ANALYSIS FOCUS:
- Look for priority levels: Critical, High, Major
- Check status transitions: In Progress, Waiting for Review, Blocked
- Identify blockers: Issues marked as blocking others
- Find customer impact: Customer reported issues, production bugs
- Spot deadline pressure: Sprint commitments, release deadlines
- Look for stale issues: Items not updated recently
- Check dependencies: Issues waiting on other issues

OUTPUT STRUCTURE:
Your findings should include:
- summary: Brief overview of Jira workload and status
- priorityItems: Critical issues requiring immediate attention
- actionItems: Specific Jira tasks to do today
- insights: Patterns about workload, blockers, or team velocity

Focus on actionable intelligence. Identify what needs immediate attention and why.`;

    const response = await this.executor.executeAgent(prompt, [
      'fetch_jira_data',
      'write_findings'
    ]);

    // Read back the findings that were written
    const findings = await this.executor.executeAgent(
      `Read the Jira findings that were just written using read_findings tool.`,
      ['read_findings']
    );

    try {
      const jsonMatch = findings.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse Jira findings:', error);
    }

    // Fallback
    const sessionId = (this.executor as any).sessionId;
    return {
      agentType: 'jira',
      timestamp: new Date().toISOString(),
      summary: 'Jira analysis completed',
      priorityItems: [],
      actionItems: [],
      insights: ['Jira data processed by agent'],
      metadata: { sessionId }
    };
  }

  static async quickAnalysis(jiraData: any): Promise<AgentFindings> {
    const timestamp = new Date().toISOString();
    const priorityItems: PriorityItem[] = [];
    const actionItems: ActionItem[] = [];
    const insights: string[] = [];

    // Analyze assigned issues
    if (jiraData?.assignedIssues) {
      jiraData.assignedIssues.forEach((issue: any) => {
        const priority = issue.fields?.priority?.name?.toLowerCase() || 'medium';
        const status = issue.fields?.status?.name || 'Unknown';
        const issueType = issue.fields?.issuetype?.name || 'Task';

        // Critical and high priority items
        if (['critical', 'highest', 'high'].includes(priority)) {
          priorityItems.push({
            id: issue.key,
            title: `${issue.key}: ${issue.fields?.summary || 'No title'}`,
            description: issue.fields?.description || 'No description',
            priority: priority === 'critical' || priority === 'highest' ? 'critical' : 'high',
            source: 'jira',
            url: issue.url || `${process.env.JIRA_URL}/browse/${issue.key}`,
            deadline: issue.fields?.duedate || undefined,
            blockingImpact: issue.fields?.issuelinks?.some((link: any) =>
              link.type?.name === 'Blocks') ? 'Blocking other issues' : undefined
          });
        }

        // Issues needing action
        if (['To Do', 'In Progress', 'In Review'].includes(status)) {
          const effort = issueType === 'Bug' ? 'quick' :
                        issueType === 'Story' ? 'large' : 'medium';

          actionItems.push({
            id: `action-${issue.key}`,
            title: `Work on ${issue.key}`,
            description: `${issueType}: ${issue.fields?.summary || 'No title'}`,
            effort,
            urgency: priority === 'critical' ? 'immediate' :
                    priority === 'high' ? 'today' : 'this_week'
          });
        }

        // Check for stale issues
        if (issue.fields?.updated) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(issue.fields.updated).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceUpdate > 7 && status === 'In Progress') {
            insights.push(`${issue.key} has been in progress for ${daysSinceUpdate} days without updates`);
          }
        }
      });
    }

    // Analyze project insights
    if (jiraData?.projects) {
      const activeProjects = jiraData.projects.filter((p: any) =>
        p.projectCategory?.name !== 'Archived'
      );
      insights.push(`Active in ${activeProjects.length} Jira projects`);
    }

    // Analyze workload distribution
    const bugCount = priorityItems.filter(item => item.title.toLowerCase().includes('bug')).length;
    const storyCount = priorityItems.filter(item => item.title.toLowerCase().includes('story')).length;

    if (bugCount > storyCount * 2) {
      insights.push('High bug-to-feature ratio - consider addressing technical debt');
    }

    // Check for blocking issues
    const blockingIssues = priorityItems.filter(item => item.blockingImpact).length;
    if (blockingIssues > 0) {
      insights.push(`${blockingIssues} issues are blocking other work - prioritize these`);
    }

    return {
      agentType: 'jira',
      timestamp,
      summary: `Found ${priorityItems.length} priority issues and ${actionItems.length} action items`,
      priorityItems,
      actionItems,
      insights,
      metadata: {
        totalIssues: jiraData?.assignedIssues?.length || 0,
        criticalCount: priorityItems.filter(item => item.priority === 'critical').length,
        highCount: priorityItems.filter(item => item.priority === 'high').length,
        bugCount,
        storyCount
      }
    };
  }
}