import {
  getRecentEmails,
  getUnreadEmails,
  getImportantEmails,
  getTodayEmails,
  getEmailsNeedingResponse
} from './gmail';

export interface GmailDataForBrief {
  recentEmails: any[];
  unreadEmails: any[];
  importantEmails: any[];
  todayEmails: any[];
  emailsNeedingResponse: any[];
  totalUnreadCount: number;
  urgentEmails: any[];
}

export async function fetchGmailData(userId: string): Promise<GmailDataForBrief | null> {
  try {
    console.log(`Fetching Gmail data for user: ${userId}`);

    const [
      recentEmails,
      unreadEmails,
      importantEmails,
      todayEmails,
      emailsNeedingResponse
    ] = await Promise.all([
      getRecentEmails(userId, 10).catch(() => []),
      getUnreadEmails(userId, 20).catch(() => []),
      getImportantEmails(userId, 10).catch(() => []),
      getTodayEmails(userId).catch(() => []),
      getEmailsNeedingResponse(userId).catch(() => [])
    ]);

    // Identify urgent emails based on keywords and patterns
    const urgentEmails = unreadEmails.filter(email => {
      const urgentKeywords = /\b(urgent|asap|emergency|critical|immediate|deadline|today|now)\b/i;
      return urgentKeywords.test(email.subject) ||
             urgentKeywords.test(email.snippet) ||
             email.subject.includes('!') ||
             email.subject.toUpperCase() === email.subject;
    });

    console.log(`Gmail data fetched: ${recentEmails.length} recent, ${unreadEmails.length} unread, ${urgentEmails.length} urgent`);

    return {
      recentEmails,
      unreadEmails,
      importantEmails,
      todayEmails,
      emailsNeedingResponse,
      totalUnreadCount: unreadEmails.length,
      urgentEmails
    };
  } catch (error) {
    console.error('Error fetching Gmail data:', error);
    return null;
  }
}