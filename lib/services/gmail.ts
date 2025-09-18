import { getNylasClient, getUserGrant, updateLastSync } from './nylas';

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  date: Date;
  snippet: string;
  body?: string;
  unread: boolean;
  starred: boolean;
  labels?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  messageCount: number;
  messages: EmailMessage[];
  lastMessageDate: Date;
  unread: boolean;
}

export interface EmailSearchOptions {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  unread?: boolean;
  starred?: boolean;
  hasAttachment?: boolean;
  after?: Date;
  before?: Date;
  limit?: number;
  label?: string;
}

function parseEmailAddress(participant: any): string {
  if (typeof participant === 'string') return participant;
  return participant.email || participant.name || 'unknown';
}

function transformNylasMessage(nylasMessage: any): EmailMessage {
  return {
    id: nylasMessage.id,
    threadId: nylasMessage.thread_id,
    subject: nylasMessage.subject || '(No Subject)',
    from: parseEmailAddress(nylasMessage.from?.[0]),
    to: (nylasMessage.to || []).map(parseEmailAddress),
    cc: nylasMessage.cc?.map(parseEmailAddress),
    date: new Date(nylasMessage.date * 1000),
    snippet: nylasMessage.snippet || '',
    body: nylasMessage.body,
    unread: nylasMessage.unread || false,
    starred: nylasMessage.starred || false,
    labels: nylasMessage.folders?.map((f: any) => f.name) || [],
    attachments: nylasMessage.attachments?.map((a: any) => ({
      id: a.id,
      filename: a.filename || 'attachment',
      contentType: a.content_type,
      size: a.size || 0,
    })),
  };
}

export async function getRecentEmails(userId: string, limit: number = 20): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const messages = await nylas.messages.list({
      identifier: grant.grantId,
      queryParams: {
        limit,
        in: 'inbox',
      },
    });

    updateLastSync(userId);

    return messages.data.map(transformNylasMessage);
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    throw new Error('Failed to fetch recent emails');
  }
}

export async function getUnreadEmails(userId: string, limit: number = 50): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const messages = await nylas.messages.list({
      identifier: grant.grantId,
      queryParams: {
        limit,
        unread: true,
        in: 'inbox',
      },
    });

    updateLastSync(userId);

    return messages.data.map(transformNylasMessage);
  } catch (error) {
    console.error('Error fetching unread emails:', error);
    throw new Error('Failed to fetch unread emails');
  }
}

export async function getImportantEmails(userId: string, limit: number = 20): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const messages = await nylas.messages.list({
      identifier: grant.grantId,
      queryParams: {
        limit,
        starred: true,
      },
    });

    updateLastSync(userId);

    return messages.data.map(transformNylasMessage);
  } catch (error) {
    console.error('Error fetching important emails:', error);
    throw new Error('Failed to fetch important emails');
  }
}

export async function searchEmails(
  userId: string,
  options: EmailSearchOptions
): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const queryParams: any = {
      limit: options.limit || 20,
    };

    if (options.query) queryParams.search_query_native = options.query;
    if (options.from) queryParams.from = options.from;
    if (options.to) queryParams.to = options.to;
    if (options.subject) queryParams.subject = options.subject;
    if (options.unread !== undefined) queryParams.unread = options.unread;
    if (options.starred !== undefined) queryParams.starred = options.starred;
    if (options.hasAttachment !== undefined) queryParams.has_attachment = options.hasAttachment;
    if (options.after) queryParams.received_after = Math.floor(options.after.getTime() / 1000);
    if (options.before) queryParams.received_before = Math.floor(options.before.getTime() / 1000);
    if (options.label) queryParams.in = options.label;

    const messages = await nylas.messages.list({
      identifier: grant.grantId,
      queryParams,
    });

    updateLastSync(userId);

    return messages.data.map(transformNylasMessage);
  } catch (error) {
    console.error('Error searching emails:', error);
    throw new Error('Failed to search emails');
  }
}

export async function getEmailThread(userId: string, threadId: string): Promise<EmailThread> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const thread = await nylas.threads.find({
      identifier: grant.grantId,
      threadId,
    });

    const messages = thread.data.messages?.map(transformNylasMessage) || [];

    const participants = new Set<string>();
    messages.forEach(msg => {
      participants.add(msg.from);
      msg.to.forEach(to => participants.add(to));
      msg.cc?.forEach(cc => participants.add(cc));
    });

    return {
      id: thread.data.id,
      subject: thread.data.subject || '(No Subject)',
      participants: Array.from(participants),
      messageCount: messages.length,
      messages,
      lastMessageDate: messages.length > 0
        ? messages[messages.length - 1].date
        : new Date(),
      unread: thread.data.unread || false,
    };
  } catch (error) {
    console.error('Error fetching email thread:', error);
    throw new Error('Failed to fetch email thread');
  }
}

export async function getEmailsByLabel(
  userId: string,
  label: string,
  limit: number = 20
): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const messages = await nylas.messages.list({
      identifier: grant.grantId,
      queryParams: {
        limit,
        in: label,
      },
    });

    updateLastSync(userId);

    return messages.data.map(transformNylasMessage);
  } catch (error) {
    console.error('Error fetching emails by label:', error);
    throw new Error('Failed to fetch emails by label');
  }
}

export async function getTodayEmails(userId: string): Promise<EmailMessage[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return searchEmails(userId, {
    after: todayStart,
    limit: 100,
  });
}

export async function getEmailsNeedingResponse(userId: string): Promise<EmailMessage[]> {
  const grant = getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  const myEmail = grant.email;

  const recentEmails = await searchEmails(userId, {
    unread: true,
    limit: 50,
  });

  return recentEmails.filter(email => {
    const isToMe = email.to.some(to =>
      to.toLowerCase().includes(myEmail.toLowerCase())
    );
    const isNotFromMe = !email.from.toLowerCase().includes(myEmail.toLowerCase());

    const hasQuestionIndicators =
      email.snippet.includes('?') ||
      email.snippet.match(/\b(please|could you|can you|would you|need|require|urgent|asap)\b/i);

    return isToMe && isNotFromMe && hasQuestionIndicators;
  });
}