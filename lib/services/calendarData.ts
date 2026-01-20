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

export interface CalendarFetchOptions {
  today?: boolean;
  upcoming?: boolean;
  needingPrep?: boolean;
  freeBusy?: boolean;
}

export async function fetchCalendarData(userId: string, options: CalendarFetchOptions = {}): Promise<CalendarDataForBrief | null> {
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

    const defaultOptions = {
      today: true,
      upcoming: true,
      needingPrep: true,
      freeBusy: true
    };

    const opts = { ...defaultOptions, ...options };

    const promises: Promise<any>[] = [];
    const indices = { today: -1, upcoming: -1, needingPrep: -1, freeBusy: -1 };

    if (opts.today) {
      indices.today = promises.push(getTodayEvents(userId).catch(() => [])) - 1;
    }
    if (opts.upcoming) {
      indices.upcoming = promises.push(getUpcomingEvents(userId, 7).catch(() => [])) - 1;
    }
    if (opts.needingPrep) {
      indices.needingPrep = promises.push(getMeetingsNeedingPrep(userId).catch(() => [])) - 1;
    }
    if (opts.freeBusy) {
      indices.freeBusy = promises.push(getFreeBusyTime(userId, todayStart, todayEnd).catch(() => [])) - 1;
    }

    const results = await Promise.all(promises);

    const getResult = (index: number) => (index === -1 ? [] : results[index]);

    const todayEvents = getResult(indices.today);
    const upcomingEvents = getResult(indices.upcoming);
    const meetingsNeedingPrep = getResult(indices.needingPrep);
    const freeBusySlots = getResult(indices.freeBusy);

    const tomorrowEvents = upcomingEvents.filter((event: any) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= tomorrowStart && eventDate < tomorrowEnd;
    });

    const busySlots = freeBusySlots.filter((slot: any) => slot.status === 'busy');
    const freeSlots = freeBusySlots.filter((slot: any) => slot.status === 'free');

    const focusTimeBlocks = freeSlots.filter((slot: any) => {
      const duration = slot.end.getTime() - slot.start.getTime();
      return duration >= 30 * 60 * 1000;
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