import { AgentExecutor } from './executor';
import { GitHubAgent } from './specialists/github-agent';
import { JiraAgent } from './specialists/jira-agent';
import { EmailAgent } from './specialists/email-agent';
import { CalendarAgent } from './specialists/calendar-agent';
import { CorrelationAgent } from './correlation-agent';
import { Brief, BriefSection, BriefItem, OverallInsights } from '@/lib/types';
import { AgentFindings, Correlation } from './tools';

export class CoordinatorAgent {
  private executor: AgentExecutor;
  private sessionId: string;
  private userId: string;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async generateBrief(): Promise<Brief> {
    console.log(`Starting agentic brief generation for session ${this.sessionId}`);

    try {
      // Phase 1: Run specialist agents in parallel
      console.log('Phase 1: Running specialist agents in parallel...');
      await this.runSpecialistAgents();

      // Phase 2: Run correlation analysis
      console.log('Phase 2: Running correlation analysis...');
      await this.runCorrelationAnalysis();

      // Phase 3: Synthesize final brief
      console.log('Phase 3: Synthesizing final brief...');
      const brief = await this.synthesizeBrief();

      console.log('Agentic brief generation completed successfully');
      return brief;

    } catch (error) {
      console.error('Error in agentic brief generation:', error);
      throw new Error('Failed to generate agentic brief');
    }
  }

  private async runSpecialistAgents(): Promise<void> {
    // Run all specialist agents in parallel for maximum efficiency
    const agentPromises = [
      this.runGitHubAgent(),
      this.runJiraAgent(),
      this.runEmailAgent(),
      this.runCalendarAgent()
    ];

    await Promise.allSettled(agentPromises);
  }

  private async runGitHubAgent(): Promise<void> {
    try {
      const agent = new GitHubAgent(this.sessionId, this.userId);
      await agent.analyze();
      console.log('GitHub agent completed');
    } catch (error) {
      console.error('GitHub agent failed:', error);
    }
  }

  private async runJiraAgent(): Promise<void> {
    try {
      const agent = new JiraAgent(this.sessionId, this.userId);
      await agent.analyze();
      console.log('Jira agent completed');
    } catch (error) {
      console.error('Jira agent failed:', error);
    }
  }

  private async runEmailAgent(): Promise<void> {
    try {
      const agent = new EmailAgent(this.sessionId, this.userId);
      await agent.analyze();
      console.log('Email agent completed');
    } catch (error) {
      console.error('Email agent failed:', error);
    }
  }

  private async runCalendarAgent(): Promise<void> {
    try {
      const agent = new CalendarAgent(this.sessionId, this.userId);
      await agent.analyze();
      console.log('Calendar agent completed');
    } catch (error) {
      console.error('Calendar agent failed:', error);
    }
  }

  private async runCorrelationAnalysis(): Promise<void> {
    try {
      const correlationAgent = new CorrelationAgent(this.sessionId, this.userId);
      await correlationAgent.analyze();
      console.log('Correlation analysis completed');
    } catch (error) {
      console.error('Correlation analysis failed:', error);
    }
  }

  private async synthesizeBrief(): Promise<Brief> {
    const prompt = `You are the Coordinator agent responsible for synthesizing a comprehensive daily brief from all specialist agent findings.

INSTRUCTIONS:
1. Call read_all_findings to get all agent findings
2. Call read_correlations to get correlation analysis
3. Synthesize everything into a cohesive daily brief

SYNTHESIS GUIDELINES:
- Prioritize items based on urgency, impact, and correlations
- Group related items together using correlation insights
- Create actionable sections that guide the day's work
- Highlight cross-tool dependencies and relationships
- Provide strategic insights about workload and priorities

BRIEF STRUCTURE:
Create sections in this priority order:
1. CRITICAL - Items needing immediate attention (deadline today, blocking others)
2. MEETINGS - Today's meetings with prep requirements and focus
3. REVIEWS - Code reviews and approvals needed
4. EMAILS - High-priority emails requiring response
5. PROGRESS - Key development work and Jira tickets
6. RISKS - Potential blockers or scheduling conflicts
7. OBSERVATIONS - Patterns and insights from correlation analysis
8. FOCUS_TIME - Available time blocks for deep work

For each section:
- Include only the most relevant items (max 5-7 per section)
- Use correlation insights to show relationships
- Provide clear next actions
- Indicate time estimates and priorities

OVERALL INSIGHTS:
- Count of hidden tasks discovered by agents
- Critical correlations that reveal dependencies
- Workload patterns and recommendations
- Strategic suggestions for optimizing the day

Focus on creating an actionable, intelligent brief that goes beyond summarization to provide strategic guidance.`;

    const response = await this.executor.executeAgent(prompt, [
      'read_all_findings',
      'read_correlations'
    ]);

    // Parse the response to extract the brief structure
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const briefData = JSON.parse(jsonMatch[0]);
        const brief = this.formatBrief(briefData);
        if (brief.sections.length > 0) {
          console.log('Synthesized brief has', brief.sections.length, 'sections');
          return brief;
        }
        console.log('Synthesized brief had 0 sections, using fallback');
      } else {
        console.log('No JSON found in coordinator response, using fallback');
      }
    } catch (error) {
      console.error('Failed to parse coordinator response:', error);
    }

    // Fallback: create brief from raw findings
    console.log('Creating fallback brief from findings files...');
    return await this.createFallbackBrief();
  }

  private async createFallbackBrief(): Promise<Brief> {
    // Read findings directly from tools (not via agent)
    const { agentTools } = await import('./tools');

    const findings = await agentTools.read_all_findings(this.sessionId);
    const correlationData = await agentTools.read_correlations(this.sessionId);

    console.log('Fallback brief - findings keys:', Object.keys(findings));
    console.log('Fallback brief - correlations count:', correlationData.length);

    return this.createBriefFromFindings(findings, correlationData);
  }

  createBriefFromFindings(
    findings: Record<string, any>,
    correlations: Correlation[]
  ): Brief {
    const sections: BriefSection[] = [];
    const allPriorityItems: BriefItem[] = [];
    const allActionItems: BriefItem[] = [];

    // Collect all items from findings - handle various agent output formats
    Object.entries(findings).forEach(([agentType, agentFindings]) => {
      if (!agentFindings) return;

      // Convert priority items to brief items (handle freestyle formats)
      const priorityItems = agentFindings.priorityItems || [];
      priorityItems.forEach((item: any) => {
        // Normalize from various formats agents might use
        const id = item.id || item.email?.id || item.issue?.id || item.pr?.id || Math.random().toString(36).substr(2, 9);
        const title = item.title || item.subject || item.email?.subject || item.issue?.title || item.type || 'Item';
        const description = item.description || item.reason || item.action_required || item.action || item.details || '';
        const priority = this.normalizePriority(item.priority || item.urgency);

        allPriorityItems.push({
          title,
          description,
          priority,
          source: agentType,
          sourceId: id,
          url: item.url || item.email?.url,
          deadline: item.deadline,
          blockingImpact: item.blockingImpact,
          correlations: correlations.filter(c =>
            c.sourceItem === id || c.targetItem === id
          ).map(c => ({
            type: c.type,
            relatedId: c.sourceItem === id ? c.targetItem : c.sourceItem,
            relatedSource: c.sourceItem === id ? c.targetAgent : c.sourceAgent,
            confidence: c.confidence,
            reason: c.reason
          }))
        });
      });

      // Convert action items to brief items (handle strings and objects)
      const actionItems = agentFindings.actionItems || [];
      actionItems.forEach((action: any) => {
        // Handle both string and object formats
        if (typeof action === 'string') {
          allActionItems.push({
            title: action,
            description: '',
            effort: 'medium',
            source: agentType,
            sourceId: Math.random().toString(36).substr(2, 9),
            deadline: 'this_week'
          });
        } else {
          const id = action.id || action.email_id || Math.random().toString(36).substr(2, 9);
          allActionItems.push({
            title: action.title || action.action || 'Action item',
            description: action.description || action.details || '',
            effort: action.effort || 'medium',
            source: agentType,
            sourceId: id,
            deadline: this.normalizeDeadline(action.urgency || action.deadline || action.priority)
          });
        }
      });
    });

    // Create sections based on priority and type
    const criticalItems = allPriorityItems.filter(item =>
      item.priority === 'critical' || item.deadline === 'today'
    );

    if (criticalItems.length > 0) {
      sections.push({
        id: 'critical',
        type: 'critical',
        title: '🔥 Critical Items',
        items: criticalItems.slice(0, 7),
        sectionInsights: `${criticalItems.length} critical items requiring immediate attention`
      });
    }

    // Meeting section
    const meetingItems = allPriorityItems.filter(item =>
      item.source === 'calendar' || item.title.toLowerCase().includes('meeting')
    );

    if (meetingItems.length > 0) {
      sections.push({
        id: 'meetings',
        type: 'meetings',
        title: '📅 Today\'s Meetings',
        items: meetingItems.slice(0, 5),
        sectionInsights: `${meetingItems.length} meetings scheduled with preparation requirements`
      });
    }

    // Reviews section
    const reviewItems = allActionItems.filter(item =>
      item.title.toLowerCase().includes('review')
    );

    if (reviewItems.length > 0) {
      sections.push({
        id: 'reviews',
        type: 'reviews',
        title: '👀 Code Reviews',
        items: reviewItems.slice(0, 5),
        sectionInsights: `${reviewItems.length} reviews needed to unblock team progress`
      });
    }

    // Email section
    const emailItems = allActionItems.filter(item =>
      item.source === 'email'
    );

    if (emailItems.length > 0) {
      sections.push({
        id: 'emails',
        type: 'emails',
        title: '📧 Priority Emails',
        items: emailItems.slice(0, 5),
        sectionInsights: `${emailItems.length} emails requiring response or follow-up`
      });
    }

    // Progress section
    const progressItems = allPriorityItems.filter(item =>
      item.source === 'jira' || item.source === 'github'
    );

    if (progressItems.length > 0) {
      sections.push({
        id: 'progress',
        type: 'progress',
        title: '🚀 Development Progress',
        items: progressItems.slice(0, 6),
        sectionInsights: `${progressItems.length} active development items across GitHub and Jira`
      });
    }

    // Create overall insights - normalize insights to strings
    const workPatterns = Object.values(findings).flatMap((f: any) => {
      const insights = f.insights || [];
      if (!Array.isArray(insights)) {
        // Handle object-style insights
        return Object.entries(insights)
          .filter(([_, v]) => typeof v === 'string')
          .map(([k, v]) => `${k}: ${v}`);
      }
      return insights.map((insight: any) => {
        if (typeof insight === 'string') return insight;
        // Handle object-style insights like {category, observation, impact}
        return insight.observation || insight.description || insight.message || JSON.stringify(insight);
      });
    });

    const overallInsights: OverallInsights = {
      hiddenTasksFound: allActionItems.length,
      criticalCorrelations: correlations
        .filter(c => c.confidence > 0.8)
        .map(c => c.reason),
      workPatterns,
      recommendations: this.generateRecommendations(allPriorityItems, allActionItems, correlations)
    };

    return {
      id: Math.random().toString(36).substr(2, 9),
      generatedAt: new Date(),
      sections,
      overallInsights
    };
  }

  private normalizePriority(value: string | undefined): 'critical' | 'high' | 'medium' | 'low' {
    if (!value) return 'medium';
    const lower = value.toLowerCase();
    if (lower.includes('critical') || lower === 'urgent') return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('low')) return 'low';
    return 'medium';
  }

  private normalizeDeadline(value: string | undefined): string {
    if (!value) return 'this_week';
    const lower = value.toLowerCase();
    if (lower.includes('immediate') || lower.includes('today') || lower.includes('now')) return 'today';
    if (lower.includes('tomorrow')) return 'tomorrow';
    return 'this_week';
  }

  private generateRecommendations(
    priorityItems: BriefItem[],
    actionItems: BriefItem[],
    correlations: Correlation[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for high workload
    if (priorityItems.length > 10) {
      recommendations.push('Consider delegating or rescheduling non-critical items - high priority workload detected');
    }

    // Check for correlation-based recommendations
    const actionableCorrelations = correlations.filter(c => c.actionable);
    if (actionableCorrelations.length > 0) {
      recommendations.push('Review correlated items together for better efficiency');
    }

    // Check for immediate items
    const immediateItems = actionItems.filter(item => item.deadline === 'today');
    if (immediateItems.length > 5) {
      recommendations.push('Focus on today\'s deadlines before taking on new work');
    }

    // Check for blocking items
    const blockingItems = priorityItems.filter(item => item.blockingImpact);
    if (blockingItems.length > 0) {
      recommendations.push(`Prioritize ${blockingItems.length} items that are blocking others`);
    }

    return recommendations;
  }

  private formatBrief(briefData: any): Brief {
    // Format the coordinator's response into a proper Brief object
    return {
      id: Math.random().toString(36).substr(2, 9),
      generatedAt: new Date(),
      sections: (briefData.sections || []).map((section: any) => ({
        ...section,
        id: section.id || section.type || Math.random().toString(36).substr(2, 9)
      })),
      overallInsights: briefData.overallInsights || {
        hiddenTasksFound: 0,
        criticalCorrelations: [],
        workPatterns: [],
        recommendations: []
      }
    };
  }
}