import { getNylasClient, getUserGrant, updateLastSync } from './nylas';

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  isPrimary: boolean;
  isReadOnly: boolean;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizer?: string;
  attendees: EventAttendee[];
  conferenceData?: ConferenceData;
  reminders?: EventReminder[];
  recurring?: boolean;
  recurringEventId?: string;
  htmlLink?: string;
}

export interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  isOrganizer: boolean;
  isOptional: boolean;
}

export interface ConferenceData {
  type: string;
  url?: string;
  meetingCode?: string;
  accessCode?: string;
  password?: string;
}

export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
  status: 'busy' | 'free';
}

function transformNylasCalendar(nylasCalendar: any): Calendar {
  return {
    id: nylasCalendar.id,
    name: nylasCalendar.name || 'Calendar',
    description: nylasCalendar.description,
    isPrimary: nylasCalendar.is_primary || false,
    isReadOnly: nylasCalendar.read_only || false,
    color: nylasCalendar.hex_color,
  };
}

function transformNylasEvent(nylasEvent: any): CalendarEvent {
  const startTime = nylasEvent.when?.start_time
    ? new Date(nylasEvent.when.start_time * 1000)
    : new Date();

  const endTime = nylasEvent.when?.end_time
    ? new Date(nylasEvent.when.end_time * 1000)
    : new Date();

  const attendees = (nylasEvent.participants || []).map((p: any) => ({
    email: p.email,
    name: p.name,
    status: p.status || 'needs_action',
    isOrganizer: p.type === 'organizer',
    isOptional: p.optional || false,
  }));

  let conferenceData: ConferenceData | undefined;
  if (nylasEvent.conferencing) {
    conferenceData = {
      type: nylasEvent.conferencing.provider || 'unknown',
      url: nylasEvent.conferencing.details?.url,
      meetingCode: nylasEvent.conferencing.details?.meeting_code,
      accessCode: nylasEvent.conferencing.details?.phone?.[0]?.pin,
      password: nylasEvent.conferencing.details?.password,
    };
  }

  const reminders = nylasEvent.reminders?.overrides?.map((r: any) => ({
    method: r.reminder_method || 'popup',
    minutes: r.reminder_minutes || 10,
  }));

  return {
    id: nylasEvent.id,
    calendarId: nylasEvent.calendar_id,
    title: nylasEvent.title || '(No Title)',
    description: nylasEvent.description,
    location: nylasEvent.location,
    startTime,
    endTime,
    isAllDay: nylasEvent.when?.object === 'date' || false,
    status: nylasEvent.status || 'confirmed',
    organizer: nylasEvent.organizer?.email,
    attendees,
    conferenceData,
    reminders,
    recurring: !!nylasEvent.recurrence,
    recurringEventId: nylasEvent.master_event_id,
    htmlLink: nylasEvent.html_link,
  };
}

export async function getCalendars(userId: string): Promise<Calendar[]> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const calendars = await nylas.calendars.list({
      identifier: grant.grantId,
    });

    await updateLastSync(userId);

    return calendars.data.map(transformNylasCalendar);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    throw new Error('Failed to fetch calendars');
  }
}

export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return getEventsInRange(userId, todayStart, todayEnd);
}

export async function getUpcomingEvents(
  userId: string,
  days: number = 7
): Promise<CalendarEvent[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  return getEventsInRange(userId, start, end);
}

export async function getEventsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const calendars = await getCalendars(userId);
    const primaryCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

    if (!primaryCalendar) {
      return [];
    }

    const events = await nylas.events.list({
      identifier: grant.grantId,
      queryParams: {
        calendarId: primaryCalendar.id,
        start: Math.floor(startDate.getTime() / 1000).toString(),
        end: Math.floor(endDate.getTime() / 1000).toString(),
        limit: 100,
      },
    });

    await updateLastSync(userId);

    return events.data
      .map(transformNylasEvent)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events');
  }
}

export async function getEventDetails(
  userId: string,
  eventId: string,
  calendarId?: string
): Promise<CalendarEvent> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const queryParams: any = {};
    if (calendarId) {
      queryParams.calendar_id = calendarId;
    }

    const event = await nylas.events.find({
      identifier: grant.grantId,
      eventId,
      queryParams,
    });

    return transformNylasEvent(event.data);
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw new Error('Failed to fetch event details');
  }
}

export async function getFreeBusyTime(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<FreeBusySlot[]> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const nylas = getNylasClient();

    const calendars = await getCalendars(userId);
    const calendarIds = calendars
      .filter(cal => !cal.isReadOnly)
      .map(cal => cal.id);

    if (calendarIds.length === 0) {
      return [{ start: startTime, end: endTime, status: 'free' }];
    }

    const availability = await nylas.calendars.getFreeBusy({
      identifier: grant.grantId,
      requestBody: {
        emails: [grant.email],
        startTime: Math.floor(startTime.getTime() / 1000),
        endTime: Math.floor(endTime.getTime() / 1000),
      },
    });

    const busySlots: FreeBusySlot[] = [];

    const freeBusyData = availability.data?.[0] as any;
    if (freeBusyData?.timeSlots) {
      freeBusyData.timeSlots.forEach((slot: any) => {
        if (slot.status === 'busy') {
          busySlots.push({
            start: new Date(slot.startTime * 1000),
            end: new Date(slot.endTime * 1000),
            status: 'busy',
          });
        }
      });
    }

    const freeSlots: FreeBusySlot[] = [];
    let currentTime = new Date(startTime);

    busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    busySlots.forEach(busySlot => {
      if (currentTime < busySlot.start) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(busySlot.start),
          status: 'free',
        });
      }
      currentTime = new Date(busySlot.end);
    });

    if (currentTime < endTime) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(endTime),
        status: 'free',
      });
    }

    return [...freeSlots, ...busySlots].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  } catch (error) {
    console.error('Error fetching free/busy time:', error);
    throw new Error('Failed to fetch free/busy time');
  }
}

export async function getRecurringEvents(userId: string): Promise<CalendarEvent[]> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    throw new Error('No Nylas grant found for user');
  }

  try {
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const events = await getEventsInRange(userId, new Date(), next30Days);

    return events.filter(event => event.recurring);
  } catch (error) {
    console.error('Error fetching recurring events:', error);
    throw new Error('Failed to fetch recurring events');
  }
}

export async function getMeetingsNeedingPrep(userId: string): Promise<CalendarEvent[]> {
  const todayEvents = await getTodayEvents(userId);
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tomorrowEvents = await getEventsInRange(userId, tomorrowStart, tomorrowEnd);

  const allEvents = [...todayEvents, ...tomorrowEvents];

  return allEvents.filter(event => {
    const needsPrep =
      event.description?.toLowerCase().includes('prepare') ||
      event.description?.toLowerCase().includes('review') ||
      event.description?.toLowerCase().includes('agenda') ||
      event.title.toLowerCase().includes('review') ||
      event.title.toLowerCase().includes('presentation') ||
      event.title.toLowerCase().includes('demo') ||
      event.attendees.length > 5;

    return needsPrep && event.status === 'confirmed';
  });
}