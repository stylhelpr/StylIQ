import RNCalendarEvents, {CalendarEventWritable} from 'react-native-calendar-events';
import {API_BASE_URL} from '../config/api';

/**
 * ➕ Create an event in the native iOS calendar
 * Returns the native event ID if successful
 */
export async function saveEventToIOSCalendar(event: {
  title: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  notes?: string;
}): Promise<string | null> {
  try {
    // ✅ Request permission
    let permission = await RNCalendarEvents.checkPermissions();
    if (permission !== 'authorized') {
      const newPerm = await RNCalendarEvents.requestPermissions();
      if (newPerm !== 'authorized') {
        console.warn('📵 Calendar permission denied');
        return null;
      }
    }

    // Get the default calendar (or first writable one)
    const calendars = await RNCalendarEvents.findCalendars();
    const defaultCalendar = calendars.find(
      c => c.isPrimary && c.allowsModifications,
    ) || calendars.find(c => c.allowsModifications);

    if (!defaultCalendar) {
      console.warn('📵 No writable calendar found');
      return null;
    }

    const eventDetails: CalendarEventWritable = {
      title: event.title,
      startDate: event.startDate.toISOString(),
      endDate: (event.endDate || event.startDate).toISOString(),
      location: event.location,
      notes: event.notes,
      calendarId: defaultCalendar.id,
    };

    // console.log('📅 Creating iOS calendar event:', eventDetails);
    const eventId = await RNCalendarEvents.saveEvent(event.title, eventDetails);
    // console.log('✅ iOS calendar event created with ID:', eventId);

    return eventId;
  } catch (err) {
    console.error('❌ Failed to save event to iOS calendar:', err);
    return null;
  }
}

/**
 * 🔄 Sync native iOS calendar events to backend
 * Pulls events for the next 14 days and uploads to NestJS.
 */
export async function syncNativeCalendarToBackend(userId: string) {
  try {
    if (!userId) {
      return;
    }

    // ✅ Request permission
    let permission = await RNCalendarEvents.checkPermissions();
    if (permission !== 'authorized') {
      const newPerm = await RNCalendarEvents.requestPermissions();
      if (newPerm !== 'authorized') {
        console.warn('📵 Calendar permission denied');
        return;
      }
    }

    // 📅 Read next 14 days
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const events = await RNCalendarEvents.fetchAllEvents(
      now.toISOString(),
      twoWeeksLater.toISOString(),
      [], // all calendars
    );

    const simplified = events.map(e => ({
      id: e.id,
      title: e.title || '(no title)',
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location || '',
      notes: e.notes || '',
    }));

    // console.log(`🗓 Found ${simplified.length} events to sync`);

    // 🚀 POST to backend
    const res = await fetch(`${API_BASE_URL}/calendar/sync-native`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userId, events: simplified}),
    });

    await res.json();
  } catch (err) {
    // Calendar sync failed silently
  }
}

/**
 * 🗑️ Delete an event from the backend calendar
 */
export async function deleteEventFromBackend(
  userId: string,
  eventId: string,
): Promise<boolean> {
  try {
    const encodedEventId = encodeURIComponent(eventId);
    const url = `${API_BASE_URL}/calendar/event/${userId}/${encodedEventId}`;
    // console.log('🗑️ Deleting event:', {userId, eventId, url});

    const res = await fetch(url, {
      method: 'DELETE',
    });
    // console.log('🗑️ Delete response status:', res.status);

    const text = await res.text();
    // console.log('🗑️ Delete response text:', text);

    try {
      const data = JSON.parse(text);
      // console.log('🗑️ Delete response data:', data);
      return data.ok === true;
    } catch (parseErr) {
      console.error('❌ Failed to parse response:', parseErr);
      return false;
    }
  } catch (err) {
    console.error('❌ Failed to delete event from backend:', err);
    return false;
  }
}

/**
 * 🗑️ Delete an event from iOS native calendar
 */
export async function deleteEventFromIOSCalendar(
  eventId: string,
): Promise<boolean> {
  try {
    const permission = await RNCalendarEvents.checkPermissions();
    if (permission !== 'authorized') {
      console.warn('📵 Calendar permission not authorized for deletion');
      return false;
    }

    await RNCalendarEvents.removeEvent(eventId);
    // console.log('✅ Deleted event from iOS calendar:', eventId);
    return true;
  } catch (err) {
    console.error('❌ Failed to delete event from iOS calendar:', err);
    return false;
  }
}

/**
 * 🔍 Check if an iOS calendar event still exists
 * Returns true if the event exists, false if it was deleted
 */
export async function checkIOSCalendarEventExists(
  eventId: string,
): Promise<boolean> {
  try {
    const permission = await RNCalendarEvents.checkPermissions();
    if (permission !== 'authorized') {
      return true; // Can't check, assume exists
    }

    // Fetch events for a wide range to find the specific event
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const events = await RNCalendarEvents.fetchAllEvents(
      oneYearAgo.toISOString(),
      oneYearLater.toISOString(),
      [],
    );

    const exists = events.some(e => e.id === eventId);
    // console.log(`🔍 iOS event ${eventId} exists: ${exists}`);
    return exists;
  } catch (err) {
    console.error('❌ Failed to check iOS calendar event:', err);
    return true; // On error, assume exists
  }
}

/**
 * 🔄 Get all iOS calendar event IDs currently in the calendar
 * Used to detect which scheduled outfit events were deleted
 */
export async function getAllIOSCalendarEventIds(): Promise<Set<string>> {
  try {
    const permission = await RNCalendarEvents.checkPermissions();
    if (permission !== 'authorized') {
      return new Set();
    }

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const events = await RNCalendarEvents.fetchAllEvents(
      oneYearAgo.toISOString(),
      oneYearLater.toISOString(),
      [],
    );

    const ids = new Set(events.map(e => e.id));
    // console.log(`📅 Found ${ids.size} iOS calendar events`);
    // Log first few IDs for debugging
    const idsArray = Array.from(ids);
    // console.log(`📅 Sample iOS event IDs:`, idsArray.slice(0, 5));
    return ids;
  } catch (err) {
    console.error('❌ Failed to fetch iOS calendar events:', err);
    return new Set();
  }
}
