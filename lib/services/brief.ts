import { fetchGitHubData } from './github';
import { fetchJiraData } from './jira';
import { processBriefWithClaude } from './claude';
import { Brief } from '@/lib/types';
import { cache, cacheKeys } from '../cache';

export async function generateDailyBriefService(userId: string): Promise<Brief> {
  const today = new Date().toDateString();
  const cacheKey = cacheKeys.brief(userId, today);
  const cachedBrief = cache.get<Brief>(cacheKey);
  
  if (cachedBrief) {
    console.log('Using cached brief for today');
    return cachedBrief;
  }

  try {
    console.log(`Generating daily brief for user: ${userId}`);

    // Fetch data from all connected tools in parallel
    const [githubData, jiraData] = await Promise.all([
      fetchGitHubData(undefined, userId).catch(error => {
        console.error('GitHub fetch failed:', error);
        return null;
      }),
      fetchJiraData(undefined, userId).catch(error => {
        console.error('Jira fetch failed:', error);
        return null;
      })
    ]);

    console.log('Fetched data:', {
      github: githubData ? 'success' : 'failed',
      jira: jiraData ? 'success' : 'failed'
    });

    // Combine all tool data
    const toolData = {
      github: githubData,
      jira: jiraData,
      gmail: null, // TODO: Implement later
      calendar: null // TODO: Implement later
    };

    // Process with Claude AI
    const brief = await processBriefWithClaude(toolData);

    console.log('Successfully generated brief with', brief.sections.length, 'sections');
    
    // Cache the brief for 1 hour
    cache.set(cacheKey, brief, 60 * 60 * 1000);
    
    return brief;
  } catch (error) {
    console.error('Error generating daily brief:', error);
    throw new Error('Failed to generate daily brief');
  }
}