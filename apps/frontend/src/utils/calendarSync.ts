import RNCalendarEvents from 'react-native-calendar-events';
import {API_BASE_URL} from '../config/api';

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

    console.log(`🗓 Found ${simplified.length} events to sync`);

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
