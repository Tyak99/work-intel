import { Brief } from '@/lib/types';
import { CoordinatorAgent } from '@/lib/agents/coordinator';
import { GitHubAgent } from '@/lib/agents/specialists/github-agent';
import { JiraAgent } from '@/lib/agents/specialists/jira-agent';
import { EmailAgent } from '@/lib/agents/specialists/email-agent';
import { CalendarAgent } from '@/lib/agents/specialists/calendar-agent';
import { CorrelationAgent } from '@/lib/agents/correlation-agent';

interface ToolData {
  jira?: any;
  github?: any;
  gmail?: any;
  calendar?: any;
}

export async function processBriefWithClaude(toolData: ToolData, userContext?: any): Promise<Brief> {
  const sessionId = Date.now().toString();
  const userId = 'user-1'; // TODO: Get from userContext when available

  console.log(`Starting agentic brief processing for session ${sessionId}`);

  // Option 1: Use full agentic workflow (for maximum intelligence)
  if (process.env.USE_AGENTIC_WORKFLOW !== 'false') {
    try {
      const coordinator = new CoordinatorAgent(sessionId, userId);
      const brief = await coordinator.generateBrief();
      console.log('Agentic brief generation completed successfully');
      return brief;
    } catch (error) {
      console.error('Agentic workflow failed, falling back to quick analysis:', error);
      // Fall through to quick analysis mode
    }
  }

  // Option 2: Quick analysis mode (fallback or for faster processing)
  console.log('Using quick analysis mode');
  return await generateQuickBrief(toolData, sessionId);
}

// Quick analysis mode using specialist agents' static methods
async function generateQuickBrief(toolData: ToolData, sessionId: string): Promise<Brief> {
  console.log('Running quick analysis using specialist agents');

  try {
    // Run quick analysis for each available data source
    const analysisPromises = [];

    if (toolData.github) {
      analysisPromises.push(GitHubAgent.quickAnalysis(toolData.github));
    }

    if (toolData.jira) {
      analysisPromises.push(JiraAgent.quickAnalysis(toolData.jira));
    }

    if (toolData.gmail) {
      analysisPromises.push(EmailAgent.quickAnalysis(toolData.gmail));
    }

    if (toolData.calendar) {
      analysisPromises.push(CalendarAgent.quickAnalysis(toolData.calendar));
    }

    // Execute all analyses in parallel
    const allFindings = await Promise.all(analysisPromises);

    // Create findings map
    const findingsMap: Record<string, any> = {};
    allFindings.forEach(findings => {
      findingsMap[findings.agentType] = findings;
    });

    // Run correlation analysis
    const correlations = await CorrelationAgent.quickAnalysis(findingsMap);

    // Create coordinator instance to synthesize the brief
    const coordinator = new CoordinatorAgent(sessionId, 'user-1');
    const brief = coordinator.createBriefFromFindings(findingsMap, correlations);

    console.log('Quick analysis completed successfully');
    return brief;

  } catch (error) {
    console.error('Quick analysis failed:', error);

    // Ultimate fallback - create minimal brief
    return {
      id: Math.random().toString(36).substr(2, 9),
      generatedAt: new Date(),
      sections: [
        {
          id: 'fallback',
          type: 'observations',
          title: '⚠️ Analysis Unavailable',
          items: [
            {
              title: 'Brief generation failed',
              description: 'Unable to analyze data - please check system logs',
              priority: 'high' as const
            }
          ]
        }
      ],
      overallInsights: {
        hiddenTasksFound: 0,
        criticalCorrelations: [],
        workPatterns: ['System analysis unavailable'],
        recommendations: ['Check system configuration and try again']
      }
    };
  }
}