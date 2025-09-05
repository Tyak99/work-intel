import JiraClient from 'jira-client';
import { cache, cacheKeys } from '../cache';

// Create Jira client instance (will be recreated as needed)
let jira: JiraClient | null = null;

function getJiraClient(): JiraClient {
  if (!jira || !process.env.JIRA_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
    jira = new JiraClient({
      protocol: 'https',
      host: process.env.JIRA_URL?.replace('https://', '').replace('http://', '') || '',
      username: process.env.JIRA_EMAIL || '',
      password: process.env.JIRA_API_TOKEN || '',
      apiVersion: '2',
      strictSSL: true
    });
  }
  return jira;
}

export async function fetchJiraData(username?: string, userId: string = 'user-1') {
  const cacheKey = cacheKeys.toolData(userId, 'jira');
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    console.log('Using cached Jira data');
    return cachedData;
  }

  try {
    const jiraClient = getJiraClient();
    const jiraUsername = username || process.env.JIRA_EMAIL?.split('@')[0];
    
    // Get issues assigned to user
    const assignedIssues = await jiraClient.searchJira(
      `assignee = "${jiraUsername}" AND status != Done ORDER BY updated DESC`,
      {
        maxResults: 20,
        fields: [
          'summary',
          'description', 
          'status',
          'priority',
          'assignee',
          'reporter',
          'created',
          'updated',
          'duedate',
          'labels',
          'components',
          'fixVersions',
          'project',
          'issuetype',
          'comment'
        ]
      }
    );

    // Get issues reported by user
    const reportedIssues = await jiraClient.searchJira(
      `reporter = "${jiraUsername}" AND status != Done ORDER BY updated DESC`,
      {
        maxResults: 10,
        fields: [
          'summary',
          'description',
          'status', 
          'priority',
          'assignee',
          'created',
          'updated',
          'project',
          'issuetype'
        ]
      }
    );

    // Get recently updated issues where user is watcher or mentioned
    const watchedIssues = await jiraClient.searchJira(
      `watcher = "${jiraUsername}" AND updated >= -7d ORDER BY updated DESC`,
      {
        maxResults: 10,
        fields: [
          'summary',
          'description',
          'status',
          'priority',
          'assignee',
          'updated',
          'project',
          'issuetype'
        ]
      }
    );

    const result = {
      assignedIssues: assignedIssues.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        reporter: issue.fields.reporter?.displayName,
        created: issue.fields.created,
        updated: issue.fields.updated,
        duedate: issue.fields.duedate,
        labels: issue.fields.labels,
        components: issue.fields.components?.map((c: any) => c.name),
        fixVersions: issue.fields.fixVersions?.map((v: any) => v.name),
        project: {
          key: issue.fields.project.key,
          name: issue.fields.project.name
        },
        issueType: issue.fields.issuetype.name,
        url: `${process.env.JIRA_URL}/browse/${issue.key}`,
        comments: issue.fields.comment?.comments?.slice(-5).map((c: any) => ({
          author: c.author.displayName,
          body: c.body,
          created: c.created,
          updated: c.updated
        }))
      })),
      reportedIssues: reportedIssues.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        created: issue.fields.created,
        updated: issue.fields.updated,
        project: {
          key: issue.fields.project.key,
          name: issue.fields.project.name
        },
        issueType: issue.fields.issuetype.name,
        url: `${process.env.JIRA_URL}/browse/${issue.key}`
      })),
      watchedIssues: watchedIssues.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        updated: issue.fields.updated,
        project: {
          key: issue.fields.project.key,
          name: issue.fields.project.name
        },
        issueType: issue.fields.issuetype.name,
        url: `${process.env.JIRA_URL}/browse/${issue.key}`
      }))
    };

    // Cache the result for 15 minutes
    cache.set(cacheKey, result, 15 * 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('Error fetching Jira data:', error);
    throw new Error('Failed to fetch Jira data');
  }
}

export async function testJiraConnection(): Promise<boolean> {
  try {
    if (!process.env.JIRA_URL || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
      console.log('Jira environment variables not set');
      return false;
    }
    
    const jiraClient = getJiraClient();
    await jiraClient.getCurrentUser();
    return true;
  } catch (error) {
    console.error('Jira connection test failed:', error);
    return false;
  }
}