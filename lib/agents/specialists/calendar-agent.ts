import { AgentExecutor } from '../executor';
import { AgentFindings, PriorityItem, ActionItem } from '../tools';

export class CalendarAgent {
  private executor: AgentExecutor;

  constructor(sessionId: string, userId: string) {
    this.executor = new AgentExecutor({ sessionId, userId });
  }

  async analyze(): Promise<AgentFindings> {
    const prompt = `You are a Calendar specialist agent for a senior software engineer. Your job is to analyze calendar data and extract actionable insights.

INSTRUCTIONS:
1. Call fetch_calendar_data to get the latest calendar information
2. Analyze the data focusing on:
   - Upcoming meetings requiring preparation
   - Back-to-back meetings with no break time
   - Important meetings with stakeholders or customers
   - Conflicting or overlapping meetings
   - Meetings missing agenda or preparation materials
   - Available focus time blocks for deep work
   - Recurring meetings that might need review

3. Identify priority items and action items:
   - Priority items: Important meetings needing prep, conflicts to resolve
   - Action items: Meeting prep tasks, agenda reviews, scheduling conflicts to fix

4. Write your findings using write_findings tool

ANALYSIS FOCUS:
- Check meeting density: back-to-back meetings, no break times
- Identify prep requirements: architecture reviews, decision meetings, presentations
- Find scheduling conflicts: overlapping meetings, travel time issues
- Look for focus time: gaps between meetings for deep work
- Check meeting importance: customer calls, leadership meetings, critical decisions
- Spot recurring patterns: too many meetings, inefficient scheduling
- Identify missing information: agendas, attendee lists, preparation materials

OUTPUT STRUCTURE:
Your findings should include:
- summary: Brief overview of calendar and scheduling insights
- priorityItems: Critical meetings requiring immediate attention or prep
- actionItems: Meeting prep tasks and scheduling actions needed
- insights: Patterns about meeting density, focus time, or scheduling efficiency

Focus on actionable intelligence. Identify what meetings need preparation and how to optimize your schedule.`;

    const response = await this.executor.executeAgent(prompt, [
      'fetch_calendar_data',
      'write_findings'
    ]);

    // Read back the findings
    const findings = await this.executor.executeAgent(
      `Read the calendar findings that were just written using read_findings tool.`,
      ['read_findings']
    );

    try {
      const jsonMatch = findings.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse calendar findings:', error);
    }

    // Fallback
    const sessionId = (this.executor as any).sessionId;
    return {
      agentType: 'calendar',
      timestamp: new Date().toISOString(),
      summary: 'Calendar analysis completed',
      priorityItems: [],
      actionItems: [],
      insights: ['Calendar data processed by agent'],
      metadata: { sessionId }
    };
  }

  static async quickAnalysis(calendarData: any): Promise<AgentFindings> {
    const timestamp = new Date().toISOString();
    const priorityItems: PriorityItem[] = [];
    const actionItems: ActionItem[] = [];
    const insights: string[] = [];

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Analyze upcoming events
    if (calendarData?.events) {
      const upcomingEvents = calendarData.events
        .filter((event: any) => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date);
          return eventStart > now && eventStart < weekEnd;
        })
        .sort((a: any, b: any) => {
          const aStart = new Date(a.start?.dateTime || a.start?.date);
          const bStart = new Date(b.start?.dateTime || b.start?.date);
          return aStart.getTime() - bStart.getTime();
        });

      let previousEventEnd: Date | null = null;

      upcomingEvents.forEach((event: any, index: number) => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        const eventEnd = new Date(event.end?.dateTime || event.end?.date);
        const title = event.summary || 'Untitled Meeting';
        const description = event.description || '';

        // Check if this is today or tomorrow
        const isToday = eventStart < todayEnd;
        const isTomorrow = eventStart >= tomorrowStart && eventStart < new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

        // High priority meetings
        const importantKeywords = ['review', 'presentation', 'demo', 'client', 'customer', 'board', 'leadership', 'architecture', 'decision'];
        const isImportant = importantKeywords.some(keyword =>
          title.toLowerCase().includes(keyword) || description.toLowerCase().includes(keyword)
        );

        if (isImportant && (isToday || isTomorrow)) {
          priorityItems.push({
            id: event.id || `event-${index}`,
            title: `Meeting: ${title}`,
            description: `${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`,
            priority: isToday ? 'critical' : 'high',
            source: 'calendar',
            url: event.htmlLink,
            deadline: isToday ? 'today' : 'tomorrow'
          });

          // Add prep action item
          actionItems.push({
            id: `prep-${event.id || index}`,
            title: `Prepare for ${title}`,
            description: `Review agenda and prepare materials`,
            effort: 'medium',
            urgency: isToday ? 'immediate' : 'today'
          });
        }

        // Check for back-to-back meetings
        if (previousEventEnd && eventStart.getTime() - previousEventEnd.getTime() < 15 * 60 * 1000) {
          insights.push(`Back-to-back meetings: ${title} starts immediately after previous meeting`);
        }

        // Check for long meetings
        const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
        if (durationMinutes > 120) {
          insights.push(`Long meeting: ${title} is ${Math.round(durationMinutes)} minutes`);
        }

        // Check for meetings without description
        if (!description && isImportant) {
          actionItems.push({
            id: `agenda-${event.id || index}`,
            title: `Request agenda for ${title}`,
            description: 'Important meeting lacks agenda or description',
            effort: 'quick',
            urgency: isToday ? 'immediate' : 'today'
          });
        }

        previousEventEnd = eventEnd;
      });

      // Analyze meeting density
      const todayMeetings = upcomingEvents.filter((event: any) => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        return eventStart < todayEnd;
      });

      if (todayMeetings.length > 6) {
        insights.push(`Heavy meeting day: ${todayMeetings.length} meetings scheduled for today`);
      }

      // Analyze focus time
      const focusBlocks = this.calculateFocusTime(todayMeetings);
      if (focusBlocks.length === 0) {
        insights.push('No focus time blocks available today - consider rescheduling non-critical meetings');
      } else {
        const totalFocusMinutes = focusBlocks.reduce((sum, block) => sum + block.duration, 0);
        if (totalFocusMinutes < 120) {
          insights.push(`Limited focus time today: only ${totalFocusMinutes} minutes of uninterrupted time`);
        } else {
          insights.push(`Focus time available: ${Math.round(totalFocusMinutes / 60)} hours in ${focusBlocks.length} blocks`);
        }
      }

      // Check for meeting conflicts
      for (let i = 0; i < upcomingEvents.length - 1; i++) {
        const currentEnd = new Date(upcomingEvents[i].end?.dateTime || upcomingEvents[i].end?.date);
        const nextStart = new Date(upcomingEvents[i + 1].start?.dateTime || upcomingEvents[i + 1].start?.date);

        if (currentEnd > nextStart) {
          priorityItems.push({
            id: `conflict-${i}`,
            title: 'Meeting Conflict Detected',
            description: `${upcomingEvents[i].summary} conflicts with ${upcomingEvents[i + 1].summary}`,
            priority: 'critical',
            source: 'calendar',
            deadline: 'immediate'
          });
        }
      }
    }

    return {
      agentType: 'calendar',
      timestamp,
      summary: `Found ${priorityItems.length} priority meetings and ${actionItems.length} action items`,
      priorityItems,
      actionItems,
      insights,
      metadata: {
        totalEvents: calendarData?.events?.length || 0,
        todayMeetings: calendarData?.events?.filter((event: any) => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date);
          return eventStart < todayEnd && eventStart > now;
        }).length || 0,
        conflictsFound: priorityItems.filter(item => item.title.includes('Conflict')).length
      }
    };
  }

  private static calculateFocusTime(meetings: any[]): { start: Date; end: Date; duration: number }[] {
    const workDayStart = new Date();
    workDayStart.setHours(9, 0, 0, 0);
    const workDayEnd = new Date();
    workDayEnd.setHours(17, 0, 0, 0);

    const focusBlocks: { start: Date; end: Date; duration: number }[] = [];
    const sortedMeetings = meetings
      .filter(meeting => {
        const start = new Date(meeting.start?.dateTime || meeting.start?.date);
        return start >= workDayStart && start <= workDayEnd;
      })
      .sort((a, b) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date);
        const bStart = new Date(b.start?.dateTime || b.start?.date);
        return aStart.getTime() - bStart.getTime();
      });

    let lastEnd = workDayStart;

    sortedMeetings.forEach(meeting => {
      const meetingStart = new Date(meeting.start?.dateTime || meeting.start?.date);
      const meetingEnd = new Date(meeting.end?.dateTime || meeting.end?.date);

      if (meetingStart > lastEnd) {
        const gapMinutes = (meetingStart.getTime() - lastEnd.getTime()) / (1000 * 60);
        if (gapMinutes >= 30) { // Only consider gaps of 30+ minutes as focus time
          focusBlocks.push({
            start: new Date(lastEnd),
            end: new Date(meetingStart),
            duration: gapMinutes
          });
        }
      }

      lastEnd = meetingEnd;
    });

    // Check for time after last meeting
    if (lastEnd < workDayEnd) {
      const finalGapMinutes = (workDayEnd.getTime() - lastEnd.getTime()) / (1000 * 60);
      if (finalGapMinutes >= 30) {
        focusBlocks.push({
          start: new Date(lastEnd),
          end: new Date(workDayEnd),
          duration: finalGapMinutes
        });
      }
    }

    return focusBlocks;
  }
}