import { AgentExecutor } from './executor';
import { AgentFindings, Correlation } from './tools';

export class CorrelationAgent {
  private executor: AgentExecutor;

  constructor(sessionId: string, userId: string) {
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async analyze(): Promise<Correlation[]> {
    const prompt = `You are a Correlation specialist agent for a senior software engineer. Your job is to analyze findings from all specialist agents and discover meaningful relationships.

INSTRUCTIONS:
1. Call read_all_findings to get findings from GitHub, Jira, Email, and Calendar agents
2. Analyze the data to find correlations between:
   - Jira tickets and GitHub PRs (e.g., PR #123 implements JIRA-456)
   - Email discussions and project work (e.g., email thread about feature X relates to PR Y)
   - Meeting prep and development work (e.g., architecture review meeting relates to design docs)
   - Blocked items across tools (e.g., PR waiting for Jira ticket approval)
   - Timeline correlations (e.g., items updated around same time)
   - People connections (e.g., same person mentioned in email and assigned to ticket)

3. Write correlations using write_correlations tool

CORRELATION TYPES:
- EXPLICIT: Direct references (PR description mentions Jira ticket ID)
- SEMANTIC: Related topics/keywords (both mention "authentication system")
- TEMPORAL: Time-based relationships (updated within same timeframe)

ANALYSIS FOCUS:
- Look for ticket IDs in PR titles/descriptions (JIRA-123, ABC-456)
- Find shared keywords across platforms (project names, feature names)
- Identify blocking relationships (PR blocked by review, ticket blocked by dependency)
- Spot timeline patterns (multiple items updated after meeting)
- Find people connections (same person in email thread and ticket assignee)
- Detect workflow patterns (email → meeting → ticket → PR)

OUTPUT STRUCTURE:
Each correlation should include:
- type: explicit|semantic|temporal
- sourceItem: ID from one agent's findings
- targetItem: ID from another agent's findings
- sourceAgent: which agent found the source item
- targetAgent: which agent found the target item
- confidence: 0.0-1.0 score of correlation strength
- reason: clear explanation of why these items are related
- actionable: whether this correlation suggests an action

Focus on correlations that reveal:
- Hidden dependencies between work items
- Opportunities to coordinate work across tools
- Patterns that suggest workflow improvements
- Items that should be prioritized together`;

    const response = await this.executor.executeAgent(prompt, [
      'read_all_findings',
      'write_correlations'
    ]);

    // Read back the correlations that were written
    const correlations = await this.executor.executeAgent(
      `Read the correlations that were just written using read_correlations tool.`,
      ['read_correlations']
    );

    try {
      const jsonMatch = correlations.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse correlations:', error);
    }

    return [];
  }

  static async quickAnalysis(allFindings: Record<string, AgentFindings>): Promise<Correlation[]> {
    const correlations: Correlation[] = [];
    let correlationId = 1;

    const agents = Object.keys(allFindings);

    // Cross-reference all agent findings
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const sourceAgent = agents[i];
        const targetAgent = agents[j];
        const sourceFindings = allFindings[sourceAgent];
        const targetFindings = allFindings[targetAgent];

        // Check correlations between priority items
        sourceFindings.priorityItems.forEach(sourceItem => {
          targetFindings.priorityItems.forEach(targetItem => {
            const correlation = this.findCorrelation(
              sourceItem,
              targetItem,
              sourceAgent,
              targetAgent,
              correlationId++
            );
            if (correlation) {
              correlations.push(correlation);
            }
          });

          // Also check against action items
          targetFindings.actionItems.forEach(targetAction => {
            const correlation = this.findActionCorrelation(
              sourceItem,
              targetAction,
              sourceAgent,
              targetAgent,
              correlationId++
            );
            if (correlation) {
              correlations.push(correlation);
            }
          });
        });
      }
    }

    // Look for temporal correlations (items from different agents updated around the same time)
    this.findTemporalCorrelations(allFindings, correlations, correlationId);

    // Look for workflow patterns
    this.findWorkflowPatterns(allFindings, correlations, correlationId);

    return correlations.sort((a, b) => b.confidence - a.confidence);
  }

  private static findCorrelation(
    sourceItem: any,
    targetItem: any,
    sourceAgent: string,
    targetAgent: string,
    id: number
  ): Correlation | null {
    const sourceText = `${sourceItem.title} ${sourceItem.description}`.toLowerCase();
    const targetText = `${targetItem.title} ${targetItem.description}`.toLowerCase();

    // Explicit correlations - direct ID references
    const jiraPattern = /[A-Z]+-\d+/g;
    const prPattern = /#\d+|pr\s*\d+/g;

    const sourceJiraIds: string[] = sourceText.match(jiraPattern) || [];
    const targetJiraIds: string[] = targetText.match(jiraPattern) || [];
    const sourcePrIds: string[] = sourceText.match(prPattern) || [];
    const targetPrIds: string[] = targetText.match(prPattern) || [];

    // Check for explicit Jira ID matches
    for (const jiraId of sourceJiraIds) {
      if (targetJiraIds.includes(jiraId) || targetText.includes(jiraId.toLowerCase())) {
        return {
          id: `correlation-${id}`,
          type: 'explicit',
          sourceItem: sourceItem.id,
          targetItem: targetItem.id,
          sourceAgent,
          targetAgent,
          confidence: 0.95,
          reason: `Both items reference Jira ticket ${jiraId}`,
          actionable: true
        };
      }
    }

    // Check for explicit PR ID matches
    for (const prId of sourcePrIds) {
      if (targetPrIds.includes(prId) || targetText.includes(prId)) {
        return {
          id: `correlation-${id}`,
          type: 'explicit',
          sourceItem: sourceItem.id,
          targetItem: targetItem.id,
          sourceAgent,
          targetAgent,
          confidence: 0.95,
          reason: `Both items reference pull request ${prId}`,
          actionable: true
        };
      }
    }

    // Semantic correlations - shared keywords
    const importantKeywords = [
      'authentication', 'authorization', 'api', 'database', 'performance',
      'security', 'deployment', 'bug', 'feature', 'refactor', 'test',
      'architecture', 'design', 'review', 'merge', 'conflict'
    ];

    const sharedKeywords = importantKeywords.filter(keyword =>
      sourceText.includes(keyword) && targetText.includes(keyword)
    );

    if (sharedKeywords.length >= 2) {
      return {
        id: `correlation-${id}`,
        type: 'semantic',
        sourceItem: sourceItem.id,
        targetItem: targetItem.id,
        sourceAgent,
        targetAgent,
        confidence: 0.7 + (sharedKeywords.length * 0.1),
        reason: `Related topics: ${sharedKeywords.join(', ')}`,
        actionable: sharedKeywords.includes('review') || sharedKeywords.includes('merge')
      };
    }

    // Check for blocking relationships
    if (sourceText.includes('block') && targetText.includes('waiting')) {
      return {
        id: `correlation-${id}`,
        type: 'semantic',
        sourceItem: sourceItem.id,
        targetItem: targetItem.id,
        sourceAgent,
        targetAgent,
        confidence: 0.8,
        reason: 'Potential blocking relationship detected',
        actionable: true
      };
    }

    return null;
  }

  private static findActionCorrelation(
    priorityItem: any,
    actionItem: any,
    sourceAgent: string,
    targetAgent: string,
    id: number
  ): Correlation | null {
    const priorityText = `${priorityItem.title} ${priorityItem.description}`.toLowerCase();
    const actionText = `${actionItem.title} ${actionItem.description}`.toLowerCase();

    // Look for action items that relate to priority items
    if (priorityText.includes('review') && actionText.includes('review')) {
      return {
        id: `correlation-${id}`,
        type: 'semantic',
        sourceItem: priorityItem.id,
        targetItem: actionItem.id,
        sourceAgent,
        targetAgent,
        confidence: 0.8,
        reason: 'Priority item may require action item completion',
        actionable: true
      };
    }

    // Check for meeting prep correlations
    if (priorityText.includes('meeting') && actionText.includes('prepare')) {
      return {
        id: `correlation-${id}`,
        type: 'semantic',
        sourceItem: priorityItem.id,
        targetItem: actionItem.id,
        sourceAgent,
        targetAgent,
        confidence: 0.85,
        reason: 'Meeting requires preparation action',
        actionable: true
      };
    }

    return null;
  }

  private static findTemporalCorrelations(
    allFindings: Record<string, AgentFindings>,
    correlations: Correlation[],
    startId: number
  ): void {
    // This is a simplified temporal analysis
    // In a real implementation, you'd compare actual timestamps from the data
    const timestamps = Object.values(allFindings).map(f => new Date(f.timestamp));
    const maxDiff = Math.max(...timestamps.map(t => t.getTime())) - Math.min(...timestamps.map(t => t.getTime()));

    if (maxDiff < 60 * 60 * 1000) { // Within 1 hour
      correlations.push({
        id: `correlation-${startId}`,
        type: 'temporal',
        sourceItem: 'multiple',
        targetItem: 'multiple',
        sourceAgent: 'multiple',
        targetAgent: 'multiple',
        confidence: 0.6,
        reason: 'Multiple systems updated within the same timeframe',
        actionable: false
      });
    }
  }

  private static findWorkflowPatterns(
    allFindings: Record<string, AgentFindings>,
    correlations: Correlation[],
    startId: number
  ): void {
    // Look for common workflow patterns
    const hasEmailDiscussion = allFindings.email?.actionItems.some(item =>
      item.title.toLowerCase().includes('respond')
    );
    const hasMeetingPrep = allFindings.calendar?.actionItems.some(item =>
      item.title.toLowerCase().includes('prepare')
    );
    const hasCodeReview = allFindings.github?.actionItems.some(item =>
      item.title.toLowerCase().includes('review')
    );
    const hasJiraWork = allFindings.jira?.actionItems.some(item =>
      item.urgency === 'today'
    );

    if (hasEmailDiscussion && hasMeetingPrep) {
      correlations.push({
        id: `correlation-${startId}`,
        type: 'semantic',
        sourceItem: 'email-discussion',
        targetItem: 'meeting-prep',
        sourceAgent: 'email',
        targetAgent: 'calendar',
        confidence: 0.75,
        reason: 'Email discussion likely relates to upcoming meeting',
        actionable: true
      });
    }

    if (hasCodeReview && hasJiraWork) {
      correlations.push({
        id: `correlation-${startId + 1}`,
        type: 'semantic',
        sourceItem: 'code-review',
        targetItem: 'jira-work',
        sourceAgent: 'github',
        targetAgent: 'jira',
        confidence: 0.8,
        reason: 'Code review activity correlates with Jira ticket progress',
        actionable: true
      });
    }
  }
}