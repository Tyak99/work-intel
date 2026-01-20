import { cache, cacheKeys } from '../cache';

async function searchJiraAPI(jql: string, fields: string[], maxResults: number = 50) {
  const baseUrl = process.env.JIRA_URL?.replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error('Jira environment variables not configured');
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Use GET endpoint as the POST endpoint has a different format in the new API
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: fields.join(',')
  });

  const response = await fetch(`${baseUrl}/rest/api/3/search/jql?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return await response.json();
}

export async function fetchJiraData(username?: string, userId: string = 'user-1') {
  const cacheKey = cacheKeys.toolData(userId, 'jira');
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    console.log('Using cached Jira data');
    return cachedData;
  }

  try {
    const jiraUsername = username || process.env.JIRA_EMAIL?.split('@')[0];
    
    const assignedFields = [
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
    ];

    const reportedFields = [
      'summary',
      'description',
      'status', 
      'priority',
      'assignee',
      'created',
      'updated',
      'project',
      'issuetype'
    ];

    const watchedFields = [
      'summary',
      'status',
      'priority',
      'assignee',
      'updated',
      'project',
      'issuetype'
    ];

    // Use currentUser() function which works reliably with the authenticated user
    const [assignedData, reportedData, watchedData] = await Promise.all([
      searchJiraAPI(
        `assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`,
        assignedFields,
        20
      ),
      searchJiraAPI(
        `reporter = currentUser() AND statusCategory != Done ORDER BY updated DESC`,
        reportedFields,
        10
      ),
      searchJiraAPI(
        `watcher = currentUser() AND updated >= -7d ORDER BY updated DESC`,
        watchedFields,
        10
      )
    ]);

    const assignedIssues = assignedData;
    const reportedIssues = reportedData;
    const watchedIssues = watchedData;

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
    
    const baseUrl = process.env.JIRA_URL?.replace(/\/$/, '');
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    console.error('Jira connection test failed:', error);
    return false;
  }
}