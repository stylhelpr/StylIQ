import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveEventToIOSCalendar,
  deleteEventFromIOSCalendar,
  getAllIOSCalendarEventIds,
} from './calendarSync';
import {Trip} from '../types/trips';

/**
 * Generate YYYY-MM-DD keys for every day in a trip's date range (inclusive).
 */
export function getTripDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return keys;

  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

const storageKey = (tripId: string, dateKey: string) =>
  `tripCalendar:${tripId}:${dateKey}`;

/**
 * Create all-day iOS Calendar events for each day of a trip.
 * Stores iOS event IDs in AsyncStorage for later cleanup.
 */
export async function syncTripToIOSCalendar(trip: Trip): Promise<void> {
  const dateKeys = getTripDateKeys(trip.startDate, trip.endDate);

  for (const dateKey of dateKeys) {
    const key = storageKey(trip.id, dateKey);
    const existing = await AsyncStorage.getItem(key);
    if (existing) continue; // already synced

    const dayStart = new Date(dateKey + 'T00:00:00');
    // All-day events: end at next-day midnight for correct iOS display
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const iosEventId = await saveEventToIOSCalendar({
      title: `Trip: ${trip.destination}`,
      startDate: dayStart,
      endDate: nextDay,
      location: trip.destination,
    });

    if (iosEventId) {
      await AsyncStorage.setItem(key, iosEventId);
    }
  }
}

/**
 * Remove all iOS Calendar events for a trip and clean up AsyncStorage.
 */
export async function removeTripFromIOSCalendar(tripId: string): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const prefix = `tripCalendar:${tripId}:`;
  const tripKeys = allKeys.filter(k => k.startsWith(prefix));

  for (const key of tripKeys) {
    const iosEventId = await AsyncStorage.getItem(key);
    if (iosEventId) {
      await deleteEventFromIOSCalendar(iosEventId);
    }
    await AsyncStorage.removeItem(key);
  }
}

/**
 * Update iOS Calendar events for a trip (remove old, create new).
 * Useful when trip dates are edited.
 */
export async function updateTripIOSCalendar(trip: Trip): Promise<void> {
  await removeTripFromIOSCalendar(trip.id);
  await syncTripToIOSCalendar(trip);
}

/**
 * Reconcile trip calendar events: verify stored iOS event IDs still exist,
 * recreate any that were deleted in iOS Calendar.app.
 * Safe to call on every foreground — skips trips that are fully intact.
 */
export async function reconcileTripCalendarEvents(
  trips: Trip[],
): Promise<void> {
  if (trips.length === 0) return;

  const iosIds = await getAllIOSCalendarEventIds();
  if (iosIds.size === 0) return; // permission denied or no events — skip

  for (const trip of trips) {
    const dateKeys = getTripDateKeys(trip.startDate, trip.endDate);
    for (const dateKey of dateKeys) {
      const key = storageKey(trip.id, dateKey);
      const storedId = await AsyncStorage.getItem(key);

      if (!storedId) {
        // Never synced — create now
        const dayStart = new Date(dateKey + 'T00:00:00');
        const nextDay = new Date(dayStart);
        nextDay.setDate(nextDay.getDate() + 1);

        const newId = await saveEventToIOSCalendar({
          title: `Trip: ${trip.destination}`,
          startDate: dayStart,
          endDate: nextDay,
          location: trip.destination,
        });
        if (newId) await AsyncStorage.setItem(key, newId);
        continue;
      }

      if (!iosIds.has(storedId)) {
        // Was synced but deleted in iOS Calendar — recreate
        await AsyncStorage.removeItem(key);
        const dayStart = new Date(dateKey + 'T00:00:00');
        const nextDay = new Date(dayStart);
        nextDay.setDate(nextDay.getDate() + 1);

        const newId = await saveEventToIOSCalendar({
          title: `Trip: ${trip.destination}`,
          startDate: dayStart,
          endDate: nextDay,
          location: trip.destination,
        });
        if (newId) await AsyncStorage.setItem(key, newId);
      }
    }
  }
}
