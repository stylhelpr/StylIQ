import RNCalendarEvents from 'react-native-calendar-events';

type AddParams = {
  title: string;
  startISO: string; // ISO string (use date.toISOString())
  endISO?: string; // defaults to +1 hour
  location?: string;
  notes?: string;
  alarmMinutesBefore?: number; // 0 = at start, 10, 30, 60, etc.
};

async function ensurePermitted(): Promise<boolean> {
  const status = await RNCalendarEvents.checkPermissions(false);
  if (status === 'authorized') return true;
  const req = await RNCalendarEvents.requestPermissions(false);
  return req === 'authorized';
}

export async function addOutfitToCalendar({
  title,
  startISO,
  endISO,
  location,
  notes,
  alarmMinutesBefore = 0,
}: AddParams): Promise<string | null> {
  const ok = await ensurePermitted();
  if (!ok) return null;

  const start = new Date(startISO);
  const end = endISO
    ? new Date(endISO)
    : new Date(start.getTime() + 60 * 60 * 1000);

  try {
    const eventId = await RNCalendarEvents.saveEvent(title || 'Outfit', {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      location,
      notes,
      // iOS alarms: negative minutes = "minutes before"
      alarms: [{date: -Math.max(0, alarmMinutesBefore)}],
    });
    return typeof eventId === 'string' ? eventId : null;
  } catch {
    return null;
  }
}

export async function removeCalendarEvent(eventId: string): Promise<boolean> {
  try {
    await RNCalendarEvents.removeEvent(eventId);
    return true;
  } catch {
    return false;
  }
}
