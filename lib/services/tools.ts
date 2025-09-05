import { testGitHubConnection } from './github';
import { testJiraConnection } from './jira';
import { ToolStatus } from '@/lib/types';
import { cache, cacheKeys } from '../cache';

// In-memory storage for tool connections (replace with database later)
const toolConnections: Record<string, Record<string, any>> = {};

export async function connectTool(
  userId: string, 
  toolType: string, 
  credentials: any
): Promise<{ success: boolean; message: string }> {
  try {
    // Test the connection based on tool type
    let isValid = false;
    
    switch (toolType) {
      case 'github':
        // Temporarily set environment variable for testing
        const originalGithubToken = process.env.GITHUB_TOKEN;
        process.env.GITHUB_TOKEN = credentials.token;
        isValid = await testGitHubConnection();
        process.env.GITHUB_TOKEN = originalGithubToken;
        break;
        
      case 'jira':
        // Temporarily set environment variables for testing
        const originalJiraUrl = process.env.JIRA_URL;
        const originalJiraEmail = process.env.JIRA_EMAIL;
        const originalJiraToken = process.env.JIRA_API_TOKEN;
        
        process.env.JIRA_URL = credentials.url;
        process.env.JIRA_EMAIL = credentials.email;
        process.env.JIRA_API_TOKEN = credentials.token;
        
        isValid = await testJiraConnection();
        
        process.env.JIRA_URL = originalJiraUrl;
        process.env.JIRA_EMAIL = originalJiraEmail;
        process.env.JIRA_API_TOKEN = originalJiraToken;
        break;
        
      default:
        return { success: false, message: 'Unsupported tool type' };
    }

    if (!isValid) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Store the connection (in memory for now)
    if (!toolConnections[userId]) {
      toolConnections[userId] = {};
    }
    
    toolConnections[userId][toolType] = {
      ...credentials,
      connectedAt: new Date(),
      lastSync: new Date()
    };

    // Invalidate caches when tool is connected
    cache.delete(cacheKeys.toolStatus(userId));
    cache.delete(cacheKeys.toolData(userId, toolType));

    return { success: true, message: 'Tool connected successfully' };
  } catch (error) {
    console.error('Error connecting tool:', error);
    return { success: false, message: 'Failed to connect tool' };
  }
}

export async function disconnectTool(userId: string, toolType: string): Promise<void> {
  if (toolConnections[userId]) {
    delete toolConnections[userId][toolType];
  }
}

export async function getToolStatus(userId: string): Promise<Record<string, ToolStatus>> {
  const cacheKey = cacheKeys.toolStatus(userId);
  const cachedStatus = cache.get<Record<string, ToolStatus>>(cacheKey);
  
  if (cachedStatus) {
    return cachedStatus;
  }

  const userConnections = toolConnections[userId] || {};
  
  // Check environment variables and test connections
  const status: Record<string, ToolStatus> = {};
  
  // GitHub Status
  if (userConnections.github || process.env.GITHUB_TOKEN) {
    try {
      const isConnected = await testGitHubConnection();
      status.github = isConnected 
        ? { status: 'connected', lastSync: userConnections.github?.lastSync || new Date() }
        : { status: 'error', error: 'Authentication failed' };
    } catch (error) {
      status.github = { status: 'error', error: 'Connection failed' };
    }
  } else {
    status.github = { status: 'disconnected' };
  }

  // Jira Status
  if (userConnections.jira || (process.env.JIRA_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN)) {
    try {
      const isConnected = await testJiraConnection();
      status.jira = isConnected 
        ? { status: 'connected', lastSync: userConnections.jira?.lastSync || new Date() }
        : { status: 'error', error: 'Authentication failed' };
    } catch (error) {
      status.jira = { status: 'error', error: 'Connection failed' };
    }
  } else {
    status.jira = { status: 'disconnected' };
  }

  // Future integrations
  status.gmail = { status: 'disconnected' }; // TODO: Implement later
  status.calendar = { status: 'disconnected' }; // TODO: Implement later

  // Cache for 5 minutes
  cache.set(cacheKey, status, 5 * 60 * 1000);

  return status;
}