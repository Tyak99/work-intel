import Anthropic from '@anthropic-ai/sdk';
import { agentTools, toolDefinitions, ToolName } from './tools';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AgentExecutorOptions {
  sessionId: string;
  userId: string;
  maxIterations?: number;
  temperature?: number;
}

export class AgentExecutor {
  private sessionId: string;
  private userId: string;
  private maxIterations: number;
  private temperature: number;

  constructor(options: AgentExecutorOptions) {
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.maxIterations = options.maxIterations || 10;
    this.temperature = options.temperature || 0.1;
  }

  async executeAgent(
    prompt: string,
    availableTools: string[] = Object.keys(agentTools)
  ): Promise<string> {
    const filteredTools = toolDefinitions.filter(tool =>
      availableTools.includes(tool.name)
    );

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    let iteration = 0;
    while (iteration < this.maxIterations) {
      console.log(`Agent iteration ${iteration + 1}/${this.maxIterations}`);

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20250106',
        max_tokens: 8000,
        temperature: this.temperature,
        messages,
        tools: filteredTools.length > 0 ? filteredTools : undefined
      });

      // Add assistant's response to conversation
      messages.push({
        role: 'assistant',
        content: response.content
      });

      // Check if Claude wants to use tools
      const toolUses = response.content.filter(
        (content): content is Anthropic.ToolUseBlock => content.type === 'tool_use'
      );

      if (toolUses.length === 0) {
        // No tools requested, return the final text response
        const textContent = response.content.find(
          (content): content is Anthropic.TextBlock => content.type === 'text'
        );
        return textContent?.text || 'No response generated';
      }

      // Execute tools and prepare results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUses) {
        try {
          console.log(`Executing tool: ${toolUse.name}`);

          const result = await this.executeTool(
            toolUse.name as ToolName,
            toolUse.input as any
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result, null, 2)
          });
        } catch (error) {
          console.error(`Tool execution failed for ${toolUse.name}:`, error);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
          });
        }
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults
      });

      iteration++;
    }

    throw new Error(`Agent exceeded maximum iterations (${this.maxIterations})`);
  }

  private async executeTool(toolName: ToolName, input: any): Promise<any> {
    if (!agentTools[toolName]) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Add sessionId and userId to tool calls that need them
    const toolsNeedingSession = [
      'write_findings',
      'read_findings',
      'list_findings_files',
      'write_correlations',
      'read_correlations',
      'read_all_findings'
    ];

    const toolsNeedingUserId = [
      'fetch_github_data',
      'fetch_jira_data',
      'fetch_gmail_data',
      'fetch_calendar_data'
    ];

    if (toolsNeedingSession.includes(toolName)) {
      input.sessionId = this.sessionId;
    }

    if (toolsNeedingUserId.includes(toolName)) {
      input.userId = this.userId;
    }

    // Execute the tool with appropriate parameters
    switch (toolName) {
      case 'fetch_github_data':
        return await agentTools.fetch_github_data(this.userId);
      case 'fetch_jira_data':
        return await agentTools.fetch_jira_data(this.userId);
      case 'fetch_gmail_data':
        return await agentTools.fetch_gmail_data(this.userId);
      case 'fetch_calendar_data':
        return await agentTools.fetch_calendar_data(this.userId);
      case 'write_findings':
        return await agentTools.write_findings(this.sessionId, input.agentType, input.findings);
      case 'read_findings':
        return await agentTools.read_findings(this.sessionId, input.agentType);
      case 'list_findings_files':
        return await agentTools.list_findings_files(this.sessionId);
      case 'write_correlations':
        return await agentTools.write_correlations(this.sessionId, input.correlations);
      case 'read_correlations':
        return await agentTools.read_correlations(this.sessionId);
      case 'read_all_findings':
        return await agentTools.read_all_findings(this.sessionId);
      default:
        throw new Error(`Tool execution not implemented for: ${toolName}`);
    }
  }

  // Utility method to run multiple agents in parallel
  static async runAgentsInParallel(
    agentConfigs: Array<{
      prompt: string;
      availableTools?: string[];
      sessionId: string;
      userId: string;
    }>
  ): Promise<string[]> {
    const promises = agentConfigs.map(config => {
      const executor = new AgentExecutor({
        sessionId: config.sessionId,
        userId: config.userId
      });
      return executor.executeAgent(config.prompt, config.availableTools);
    });

    return await Promise.all(promises);
  }
}