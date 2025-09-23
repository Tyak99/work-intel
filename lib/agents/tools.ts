import { fetchGitHubData } from '@/lib/services/github';
import { fetchJiraData } from '@/lib/services/jira';
import { fetchGmailData } from '@/lib/services/gmailData';
import { fetchCalendarData } from '@/lib/services/calendarData';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// Types for agent findings
export interface AgentFindings {
  agentType: string;
  timestamp: string;
  summary: string;
  priorityItems: PriorityItem[];
  actionItems: ActionItem[];
  insights: string[];
  metadata: Record<string, any>;
}

export interface PriorityItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  url?: string;
  deadline?: string;
  blockingImpact?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  effort: 'quick' | 'medium' | 'large';
  deadline?: string;
  urgency: 'immediate' | 'today' | 'this_week' | 'later';
}

export interface Correlation {
  id: string;
  type: 'explicit' | 'semantic' | 'temporal';
  sourceItem: string;
  targetItem: string;
  sourceAgent: string;
  targetAgent: string;
  confidence: number;
  reason: string;
  actionable?: boolean;
}

// Tool implementations
export const agentTools = {
  // Data fetching tools
  fetch_github_data: async (userId: string) => {
    console.log('TOOL: fetch_github_data for', userId);
    return await fetchGitHubData(undefined, userId);
  },

  fetch_jira_data: async (userId: string) => {
    console.log('TOOL: fetch_jira_data for', userId);
    return await fetchJiraData(undefined, userId);
  },

  fetch_gmail_data: async (userId: string) => {
    console.log('TOOL: fetch_gmail_data for', userId);
    return await fetchGmailData(userId);
  },

  fetch_calendar_data: async (userId: string) => {
    console.log('TOOL: fetch_calendar_data for', userId);
    return await fetchCalendarData(userId);
  },

  // File manipulation tools
  write_findings: async (sessionId: string, agentType: string, findings: AgentFindings) => {
    console.log(`TOOL: write_findings for ${agentType} in session ${sessionId}`);
    const sessionDir = `/tmp/brief-session-${sessionId}`;
    await fs.mkdir(sessionDir, { recursive: true });
    const filename = path.join(sessionDir, `${agentType}-findings.json`);
    await fs.writeFile(filename, JSON.stringify(findings, null, 2));
    return { success: true, filename };
  },

  read_findings: async (sessionId: string, agentType: string): Promise<AgentFindings | null> => {
    console.log(`TOOL: read_findings for ${agentType} in session ${sessionId}`);
    try {
      const sessionDir = `/tmp/brief-session-${sessionId}`;
      const filename = path.join(sessionDir, `${agentType}-findings.json`);
      const content = await fs.readFile(filename, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.log(`No findings found for ${agentType}:`, error);
      return null;
    }
  },

  list_findings_files: async (sessionId: string): Promise<string[]> => {
    console.log(`TOOL: list_findings_files for session ${sessionId}`);
    try {
      const sessionDir = `/tmp/brief-session-${sessionId}`;
      const files = await fs.readdir(sessionDir);
      return files.filter(f => f.endsWith('-findings.json'));
    } catch (error) {
      console.log('No session directory found:', error);
      return [];
    }
  },

  write_correlations: async (sessionId: string, correlations: Correlation[]) => {
    console.log(`TOOL: write_correlations for session ${sessionId}`);
    const sessionDir = `/tmp/brief-session-${sessionId}`;
    await fs.mkdir(sessionDir, { recursive: true });
    const filename = path.join(sessionDir, 'correlations.json');
    await fs.writeFile(filename, JSON.stringify(correlations, null, 2));
    return { success: true, filename };
  },

  read_correlations: async (sessionId: string): Promise<Correlation[]> => {
    console.log(`TOOL: read_correlations for session ${sessionId}`);
    try {
      const sessionDir = `/tmp/brief-session-${sessionId}`;
      const filename = path.join(sessionDir, 'correlations.json');
      const content = await fs.readFile(filename, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.log('No correlations found:', error);
      return [];
    }
  },

  read_all_findings: async (sessionId: string): Promise<Record<string, AgentFindings>> => {
    console.log(`TOOL: read_all_findings for session ${sessionId}`);
    const files = await agentTools.list_findings_files(sessionId);
    const allFindings: Record<string, AgentFindings> = {};

    for (const file of files) {
      const agentType = file.replace('-findings.json', '');
      const findings = await agentTools.read_findings(sessionId, agentType);
      if (findings) {
        allFindings[agentType] = findings;
      }
    }

    return allFindings;
  }
};

// Tool definitions for Claude's tool-use API
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'fetch_github_data',
    description: 'Fetches GitHub data including pull requests, issues, and recent activity for analysis',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to fetch GitHub data for' }
      },
      required: ['userId']
    }
  },
  {
    name: 'fetch_jira_data',
    description: 'Fetches Jira data including assigned issues, recent activity, and project information',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to fetch Jira data for' }
      },
      required: ['userId']
    }
  },
  {
    name: 'fetch_gmail_data',
    description: 'Fetches Gmail data including recent emails, threads, and important messages',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to fetch Gmail data for' }
      },
      required: ['userId']
    }
  },
  {
    name: 'fetch_calendar_data',
    description: 'Fetches calendar data including upcoming meetings, events, and scheduling information',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to fetch calendar data for' }
      },
      required: ['userId']
    }
  },
  {
    name: 'write_findings',
    description: 'Writes agent findings to a structured JSON file for later use by other agents',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Unique session ID for this brief generation' },
        agentType: { type: 'string', description: 'Type of agent (github, jira, email, calendar)' },
        findings: {
          type: 'object',
          description: 'Structured findings object with summary, priority items, action items, and insights'
        }
      },
      required: ['sessionId', 'agentType', 'findings']
    }
  },
  {
    name: 'read_findings',
    description: 'Reads findings from a specific agent for correlation or synthesis',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to read findings from' },
        agentType: { type: 'string', description: 'Type of agent whose findings to read' }
      },
      required: ['sessionId', 'agentType']
    }
  },
  {
    name: 'list_findings_files',
    description: 'Lists all available findings files in the current session',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to list files for' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'write_correlations',
    description: 'Writes correlation analysis between different agent findings',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID for this analysis' },
        correlations: {
          type: 'array',
          description: 'Array of correlation objects linking items across agents'
        }
      },
      required: ['sessionId', 'correlations']
    }
  },
  {
    name: 'read_correlations',
    description: 'Reads correlation analysis for synthesis',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to read correlations from' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'read_all_findings',
    description: 'Reads all agent findings at once for final synthesis',
    input_schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to read all findings from' }
      },
      required: ['sessionId']
    }
  }
];

export type ToolName = keyof typeof agentTools;