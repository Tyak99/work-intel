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

export interface GmailFetchOptions {
  recent?: boolean;
  unread?: boolean;
  important?: boolean;
  today?: boolean;
  needingResponse?: boolean;
}

export async function fetchGmailData(userId: string, options: GmailFetchOptions = {}): Promise<GmailDataForBrief | null> {
  try {
    console.log(`Fetching Gmail data for user: ${userId}`);

    const defaultOptions = {
      recent: true,
      unread: true,
      important: false,
      today: false,
      needingResponse: false
    };

    const opts = { ...defaultOptions, ...options };

    const promises: Promise<any>[] = [];
    const indices = { recent: -1, unread: -1, important: -1, today: -1, needingResponse: -1 };

    if (opts.recent) {
      indices.recent = promises.push(getRecentEmails(userId, 15).catch(() => [])) - 1;
    }
    if (opts.unread) {
      indices.unread = promises.push(getUnreadEmails(userId, 15).catch(() => [])) - 1;
    }
    if (opts.important) {
      indices.important = promises.push(getImportantEmails(userId, 10).catch(() => [])) - 1;
    }
    if (opts.today) {
      indices.today = promises.push(getTodayEmails(userId).catch(() => [])) - 1;
    }
    if (opts.needingResponse) {
      indices.needingResponse = promises.push(getEmailsNeedingResponse(userId).catch(() => [])) - 1;
    }

    const results = await Promise.all(promises);

    const getResult = (index: number) => (index === -1 ? [] : results[index]);

    const recentEmails = getResult(indices.recent);
    const unreadEmails = getResult(indices.unread);
    const importantEmails = getResult(indices.important);
    const todayEmails = getResult(indices.today);
    const emailsNeedingResponse = getResult(indices.needingResponse);

    // Identify urgent emails based on keywords and patterns
    const urgentEmails = unreadEmails.filter((email: any) => {
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
