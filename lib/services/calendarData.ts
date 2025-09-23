import {
  getTodayEvents,
  getUpcomingEvents,
  getMeetingsNeedingPrep,
  getFreeBusyTime
} from './calendar';

export interface CalendarDataForBrief {
  todayEvents: any[];
  tomorrowEvents: any[];
  upcomingEvents: any[];
  meetingsNeedingPrep: any[];
  freeBusySlots: any[];
  totalMeetingsToday: number;
  focusTimeBlocks: any[];
}

export async function fetchCalendarData(userId: string): Promise<CalendarDataForBrief | null> {
  try {
    console.log(`Fetching Calendar data for user: ${userId}`);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const [
      todayEvents,
      upcomingEvents,
      meetingsNeedingPrep,
      freeBusySlots
    ] = await Promise.all([
      getTodayEvents(userId).catch(() => []),
      getUpcomingEvents(userId, 7).catch(() => []),
      getMeetingsNeedingPrep(userId).catch(() => []),
      getFreeBusyTime(userId, todayStart, todayEnd).catch(() => [])
    ]);

    // Get tomorrow's events separately
    const tomorrowEvents = upcomingEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= tomorrowStart && eventDate < tomorrowEnd;
    });

    // Calculate focus time blocks (free time between meetings)
    const busySlots = freeBusySlots.filter(slot => slot.status === 'busy');
    const freeSlots = freeBusySlots.filter(slot => slot.status === 'free');

    // Focus blocks are free slots longer than 30 minutes
    const focusTimeBlocks = freeSlots.filter(slot => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration >= 30 * 60 * 1000; // 30 minutes in milliseconds
    });

    console.log(`Calendar data fetched: ${todayEvents.length} today, ${tomorrowEvents.length} tomorrow, ${focusTimeBlocks.length} focus blocks`);

    return {
      todayEvents,
      tomorrowEvents,
      upcomingEvents: upcomingEvents.slice(0, 10), // Limit to next 10 events
      meetingsNeedingPrep,
      freeBusySlots,
      totalMeetingsToday: todayEvents.length,
      focusTimeBlocks
    };
  } catch (error) {
    console.error('Error fetching Calendar data:', error);
    return null;
  }
}