import { fetchGitHubData } from './github';
import { fetchJiraData } from './jira';
import { fetchGmailData } from './gmailData';
import { fetchCalendarData } from './calendarData';
import { fetchDriveData } from './driveData';
import { processBriefWithClaude } from './claude';
import { Brief } from '@/lib/types';
import { cache, cacheKeys } from '../cache';
import { getUserGrant } from './nylas';
import { getUserDriveGrant } from './google-drive';
import { supabase } from '../supabase';

/**
 * Save a brief to the database
 */
export async function saveBriefToDatabase(userId: string, brief: Brief): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const { error } = await supabase
    .from('briefs')
    .upsert({
      user_id: userId,
      brief_date: today,
      content: brief,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,brief_date',
    });

  if (error) {
    console.error('Error saving brief to database:', error);
    // Don't throw - saving to DB is best-effort
  }
}

/**
 * Get a brief from the database
 * @param userId - The user's ID
 * @param date - Optional date in YYYY-MM-DD format. Defaults to today.
 */
export async function getBriefFromDatabase(userId: string, date?: string): Promise<Brief | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('briefs')
    .select('*')
    .eq('user_id', userId)
    .eq('brief_date', targetDate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No brief found
      return null;
    }
    console.error('Error fetching brief from database:', error);
    return null;
  }

  return data?.content as Brief;
}

/**
 * Get brief history for a user (last 30 days)
 */
export async function getBriefHistory(userId: string, limit: number = 30): Promise<{ date: string; brief: Brief }[]> {
  const { data, error } = await supabase
    .from('briefs')
    .select('brief_date, content')
    .eq('user_id', userId)
    .order('brief_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching brief history:', error);
    return [];
  }

  return (data || []).map(row => ({
    date: row.brief_date,
    brief: row.content as Brief,
  }));
}

export async function generateDailyBriefService(userId: string): Promise<Brief> {
  const today = new Date().toDateString();
  const cacheKey = cacheKeys.brief(userId, today);

  // L1 Cache: In-memory
  const cachedBrief = cache.get<Brief>(cacheKey);
  if (cachedBrief) {
    console.log('Using L1 cached brief (memory) for today');
    return cachedBrief;
  }

  // L2 Cache: Database
  const dbBrief = await getBriefFromDatabase(userId);
  if (dbBrief) {
    console.log('Using L2 cached brief (database) for today');
    // Populate L1 cache from L2
    cache.set(cacheKey, dbBrief, 60 * 60 * 1000); // 1 hour
    return dbBrief;
  }

  try {
    console.log(`Generating daily brief for user: ${userId}`);

    // Check if Nylas is connected before fetching email/calendar data
    const nylasGrant = await getUserGrant(userId);
    const hasNylasConnection = !!nylasGrant;

    // Check if Google Drive is connected
    const driveGrant = await getUserDriveGrant(userId);
    const hasDriveConnection = !!driveGrant;

    // Fetch data from all connected tools in parallel
    const [githubData, jiraData, gmailData, calendarData, driveData] = await Promise.all([
      fetchGitHubData(undefined, userId).catch(error => {
        console.error('GitHub fetch failed:', error);
        return null;
      }),
      fetchJiraData(undefined, userId).catch(error => {
        console.error('Jira fetch failed:', error);
        return null;
      }),
      hasNylasConnection ? fetchGmailData(userId).catch(error => {
        console.error('Gmail fetch failed:', error);
        return null;
      }) : Promise.resolve(null),
      hasNylasConnection ? fetchCalendarData(userId).catch(error => {
        console.error('Calendar fetch failed:', error);
        return null;
      }) : Promise.resolve(null),
      hasDriveConnection ? fetchDriveData(userId).catch(error => {
        console.error('Drive fetch failed:', error);
        return null;
      }) : Promise.resolve(null)
    ]);

    console.log('Fetched data:', {
      github: githubData ? 'success' : 'failed',
      jira: jiraData ? 'success' : 'failed',
      gmail: gmailData ? 'success' : hasNylasConnection ? 'failed' : 'not connected',
      calendar: calendarData ? 'success' : hasNylasConnection ? 'failed' : 'not connected',
      drive: driveData ? 'success' : hasDriveConnection ? 'failed' : 'not connected'
    });

    // Combine all tool data
    const toolData = {
      github: githubData,
      jira: jiraData,
      gmail: gmailData,
      calendar: calendarData,
      drive: driveData
    };

    // Process with Claude AI
    const brief = await processBriefWithClaude(toolData);

    console.log('Successfully generated brief with', brief.sections.length, 'sections');

    // Save to L1 cache (memory) - 1 hour TTL
    cache.set(cacheKey, brief, 60 * 60 * 1000);

    // Save to L2 cache (database) - persisted
    await saveBriefToDatabase(userId, brief);

    return brief;
  } catch (error) {
    console.error('Error generating daily brief:', error);
    throw new Error('Failed to generate daily brief');
  }
}