import { AgentExecutor } from '../executor';
import { AgentFindings, PriorityItem, ActionItem } from '../tools';

export class EmailAgent {
  private executor: AgentExecutor;

  constructor(sessionId: string, userId: string) {
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async analyze(): Promise<AgentFindings> {
    const prompt = `You are an Email specialist agent for a senior software engineer. Your job is to analyze Gmail data and extract actionable insights.

INSTRUCTIONS:
1. Call fetch_gmail_data to get the latest email information
2. Analyze the data focusing on:
   - Urgent emails requiring immediate response
   - Action items mentioned in email threads
   - Meeting requests and calendar invites
   - Requests from team members or stakeholders
   - Customer escalations or support requests
   - Deadline reminders or time-sensitive communications
   - Unread high-priority emails

3. Identify priority items and action items:
   - Priority items: Urgent requests, escalations, time-sensitive matters
   - Action items: Emails to respond to, commitments to follow up on

4. Write your findings using write_findings tool

ANALYSIS FOCUS:
- Look for urgency signals: "urgent", "asap", "immediate", "critical"
- Check sender importance: manager, customers, external stakeholders
- Find action requests: "please review", "need your input", "can you help"
- Identify commitments: "I'll get back to you by...", "will send by Friday"
- Spot meeting prep: agenda items, prep materials, action items from previous meetings
- Look for blockers: people waiting for your response
- Check email age: recent emails might be more urgent

OUTPUT STRUCTURE:
Your findings should include:
- summary: Brief overview of email workload and urgent items
- priorityItems: Critical emails requiring immediate attention
- actionItems: Specific emails to respond to or follow up on
- insights: Patterns about communication, workload, or commitments

Focus on actionable intelligence. Identify what emails need responses and why they're important.`;

    const response = await this.executor.executeAgent(prompt, [
      'fetch_gmail_data',
      'write_findings'
    ]);

    // Read back the findings
    const findings = await this.executor.executeAgent(
      `Read the email findings that were just written using read_findings tool.`,
      ['read_findings']
    );

    try {
      const jsonMatch = findings.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse email findings:', error);
    }

    // Fallback
    const sessionId = (this.executor as any).sessionId;
    return {
      agentType: 'email',
      timestamp: new Date().toISOString(),
      summary: 'Email analysis completed',
      priorityItems: [],
      actionItems: [],
      insights: ['Email data processed by agent'],
      metadata: { sessionId }
    };
  }

  static async quickAnalysis(gmailData: any): Promise<AgentFindings> {
    const timestamp = new Date().toISOString();
    const priorityItems: PriorityItem[] = [];
    const actionItems: ActionItem[] = [];
    const insights: string[] = [];

    // Analyze recent emails
    if (gmailData?.messages) {
      gmailData.messages.forEach((message: any, index: number) => {
        const subject = message.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = message.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const date = message.payload?.headers?.find((h: any) => h.name === 'Date')?.value;

        // Extract text content for analysis
        let bodyText = '';
        if (message.payload?.parts) {
          const textPart = message.payload.parts.find((part: any) => part.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            bodyText = Buffer.from(textPart.body.data, 'base64').toString();
          }
        } else if (message.payload?.body?.data) {
          bodyText = Buffer.from(message.payload.body.data, 'base64').toString();
        }

        const lowerSubject = subject.toLowerCase();
        const lowerBody = bodyText.toLowerCase();

        // Check for urgency signals
        const urgencySignals = ['urgent', 'asap', 'immediate', 'critical', 'emergency', 'deadline'];
        const isUrgent = urgencySignals.some(signal =>
          lowerSubject.includes(signal) || lowerBody.includes(signal)
        );

        // Check for action requests
        const actionSignals = ['please review', 'need your input', 'can you help', 'waiting for', 'follow up'];
        const needsAction = actionSignals.some(signal => lowerBody.includes(signal));

        // Check if unread (labelIds contains UNREAD)
        const isUnread = message.labelIds?.includes('UNREAD');

        // Calculate email age
        const emailDate = date ? new Date(date) : new Date();
        const hoursOld = Math.floor((Date.now() - emailDate.getTime()) / (1000 * 60 * 60));

        // Prioritize based on criteria
        if (isUrgent || (isUnread && hoursOld < 24)) {
          priorityItems.push({
            id: message.id,
            title: `Email: ${subject}`,
            description: `From: ${from}\n${bodyText.substring(0, 200)}...`,
            priority: isUrgent ? 'critical' : 'high',
            source: 'gmail',
            url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
            deadline: isUrgent ? 'today' : undefined
          });
        }

        // Create action items for emails needing response
        if (needsAction || (isUnread && hoursOld < 72)) {
          actionItems.push({
            id: `respond-${message.id}`,
            title: `Respond to: ${subject}`,
            description: `Reply to ${from}`,
            effort: bodyText.length > 500 ? 'medium' : 'quick',
            urgency: isUrgent ? 'immediate' : hoursOld < 24 ? 'today' : 'this_week'
          });
        }

        // Look for meeting requests or calendar items
        if (lowerSubject.includes('meeting') || lowerSubject.includes('calendar') ||
            lowerBody.includes('agenda') || lowerBody.includes('meeting invite')) {
          insights.push(`Meeting-related email from ${from}: ${subject}`);
        }

        // Look for external stakeholders or customers
        if (!from.includes(process.env.COMPANY_DOMAIN || 'your-company.com')) {
          insights.push(`External communication: ${subject} from ${from}`);
        }
      });
    }

    // Analyze workload insights
    const unreadCount = gmailData?.messages?.filter((m: any) =>
      m.labelIds?.includes('UNREAD')).length || 0;

    if (unreadCount > 10) {
      insights.push(`High unread email count (${unreadCount}) - consider email triage`);
    }

    const urgentCount = priorityItems.filter(item => item.priority === 'critical').length;
    if (urgentCount > 3) {
      insights.push(`Multiple urgent emails (${urgentCount}) require immediate attention`);
    }

    // Check for patterns in action items
    const immediateActions = actionItems.filter(item => item.urgency === 'immediate').length;
    const todayActions = actionItems.filter(item => item.urgency === 'today').length;

    if (immediateActions > 0) {
      insights.push(`${immediateActions} emails need immediate response`);
    }

    if (todayActions > 5) {
      insights.push('Heavy email response workload for today - consider batching responses');
    }

    return {
      agentType: 'email',
      timestamp,
      summary: `Found ${priorityItems.length} priority emails and ${actionItems.length} action items`,
      priorityItems,
      actionItems,
      insights,
      metadata: {
        totalEmails: gmailData?.messages?.length || 0,
        unreadCount,
        urgentCount,
        externalEmails: insights.filter(i => i.includes('External communication')).length
      }
    };
  }
}