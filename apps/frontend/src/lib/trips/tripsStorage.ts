import AsyncStorage from '@react-native-async-storage/async-storage';
import {Trip, ClosetLocation} from '../../types/trips';
import {apiClient} from '../apiClient';

const TRIPS_KEY = '@styliq_trips';
const LOCATIONS_KEY = '@styliq_closet_locations';

const DEFAULT_LOCATIONS: ClosetLocation[] = [
  {id: 'home', label: 'Home'},
];

/** Labels for legacy location IDs that are no longer in defaults. */
const LEGACY_LABELS: Record<string, string> = {
  office: 'Office',
  parents: "Parents' House",
  partner: "Partner's Place",
};

/** Convert a raw location_id into a displayable label. */
export function locationLabel(id: string, locations: ClosetLocation[]): string {
  const found = locations.find(l => l.id === id);
  if (found) return found.label;
  return LEGACY_LABELS[id] ?? id.replace(/^custom_/, '').replace(/_/g, ' ');
}

// ── Trips CRUD ──

export async function getTrips(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(TRIPS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Trip[];
  } catch {
    return [];
  }
}

export async function saveTrip(trip: Trip): Promise<boolean> {
  try {
    const trips = await getTrips();
    trips.unshift(trip);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));

    // Sync to backend (fire-and-forget, never blocks UI)
    try {
      const items = (trip.capsule?.packingList ?? []).flatMap(g =>
        (g.items ?? []).map(i => ({wardrobeItemId: i.wardrobeItemId})),
      );
      const payload = {
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        items,
        ...(trip.activities?.length ? {activities: trip.activities} : {}),
        ...(trip.weather?.length ? {weather: trip.weather} : {}),
        ...(trip.capsule ? {capsule: trip.capsule} : {}),
        ...(trip.startingLocationId
          ? {startingLocationId: trip.startingLocationId}
          : {}),
        ...(trip.startingLocationLabel
          ? {startingLocationLabel: trip.startingLocationLabel}
          : {}),
      };
      console.log('[TripsStorage] POST /trips payload:', JSON.stringify(payload).slice(0, 500));
      const res = await apiClient.post('/trips', payload);
      const backendId = res.data?.id;
      console.log('[TripsStorage] synced trip id=', backendId);

      // Replace local ID with backend UUID so future PATCH calls use the correct ID
      if (backendId && backendId !== trip.id) {
        const oldId = trip.id;
        trip.id = backendId;
        const updatedTrips = await getTrips();
        const idx = updatedTrips.findIndex(t => t.id === oldId);
        if (idx >= 0) {
          updatedTrips[idx].id = backendId;
          await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updatedTrips));
          console.log('[TripsStorage] local ID updated to backend UUID:', backendId);
        }
      }
    } catch (syncErr: any) {
      console.warn('[TripsStorage] backend sync failed', {
        message: syncErr?.message,
        code: syncErr?.code,
        status: syncErr?.response?.status,
        data: syncErr?.response?.data,
      });
    }

    return true;
  } catch (err) {
    console.error('[TripsStorage] saveTrip failed:', err);
    return false;
  }
}

export async function updateTrip(updated: Trip): Promise<boolean> {
  try {
    const trips = await getTrips();
    const idx = trips.findIndex(t => t.id === updated.id);
    if (idx >= 0) {
      trips[idx] = updated;
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    }

    // Sync capsule + items to backend
    try {
      const items = (updated.capsule?.packingList ?? []).flatMap(g =>
        (g.items ?? []).map(i => ({wardrobeItemId: i.wardrobeItemId})),
      );
      if (__DEV__) {
        console.log('[TripCapsule][SAVE_PAYLOAD]', {
          tripId: updated.id,
          itemsLength: items?.length,
          capsulePresent: !!updated.capsule,
          capsuleFingerprint: updated.capsule?.fingerprint ?? null,
          capsuleVersion: updated.capsule?.version ?? null,
        });
        if (items.length === 0 && !updated.capsule) {
          const err = new Error('[TripCapsule][WIPE_STACK]');
          console.log('[TripCapsule][WIPE_DETECTED]', {
            tripId: updated.id,
            itemsLength: items.length,
            capsulePresent: false,
            at: new Date().toISOString(),
          });
          console.log(err.stack);
        }
      }

      // GUARD: never persist an empty capsule to backend — this wipes swap data
      // Returns false: local write succeeded but remote was intentionally skipped
      if (items.length === 0 && !updated.capsule) {
        if (__DEV__) {
          console.warn('[TripCapsule] Prevented empty capsule persist', updated.id);
        }
        return false;
      }

      await apiClient.patch(`/trips/${updated.id}/items`, {
        items,
        capsule: updated.capsule ?? null,
      });
    } catch (syncErr: any) {
      console.error('[TripsStorage][SYNC_ERROR]', {
        tripId: updated.id,
        payload: {items: (updated.capsule?.packingList ?? []).flatMap(g => (g.items ?? []).map(i => i.wardrobeItemId)).length + ' items', capsule: updated.capsule ? 'present' : 'null'},
        error: syncErr?.response?.data || syncErr?.message || syncErr,
        status: syncErr?.response?.status,
        url: `/trips/${updated.id}/items`,
      });
    }

    return true;
  } catch (err) {
    console.error('[TripsStorage] updateTrip failed:', err);
    return false;
  }
}

export async function deleteTrip(id: string): Promise<boolean> {
  console.log('[TripsStorage] DELETE /trips/' + id);
  try {
    await apiClient.delete(`/trips/${id}`);
    console.log('[TripsStorage] backend delete success');
  } catch (err: any) {
    console.error('[TripsStorage] backend delete failed', {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    return false;
  }
  try {
    const trips = await getTrips();
    const filtered = trips.filter(t => t.id !== id);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('[TripsStorage] deleteTrip local cleanup failed:', err);
    return false;
  }
}

export async function clearAllTrips(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(TRIPS_KEY);
    console.log('[TripsStorage] cleared all trips');
    return true;
  } catch (err) {
    console.error('[TripsStorage] clearAllTrips failed:', err);
    return false;
  }
}

// ── Closet Locations ──

export async function getClosetLocations(): Promise<ClosetLocation[]> {
  const raw = await AsyncStorage.getItem(LOCATIONS_KEY);
  if (!raw) return [...DEFAULT_LOCATIONS];
  try {
    const locations = JSON.parse(raw) as ClosetLocation[];
    if (locations.length === 0) return [...DEFAULT_LOCATIONS];
    // Ensure "home" is always present
    if (!locations.some(l => l.id === 'home')) {
      locations.unshift({id: 'home', label: 'Home'});
    }
    return locations;
  } catch {
    return [...DEFAULT_LOCATIONS];
  }
}

export async function addClosetLocation(
  label: string,
  color?: string,
): Promise<ClosetLocation | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;
  try {
    const locations = await getClosetLocations();
    const duplicate = locations.some(
      l => l.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return null;
    const newLoc: ClosetLocation = {
      id: `custom_${Date.now()}`,
      label: trimmed,
      ...(color ? {color} : {}),
    };
    locations.push(newLoc);
    await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    return newLoc;
  } catch (err) {
    console.error('[TripsStorage] addClosetLocation failed:', err);
    return null;
  }
}

export async function updateClosetLocation(
  id: string,
  updates: {label?: string; color?: string},
): Promise<boolean> {
  if (id === 'home' && updates.label && updates.label !== 'Home') return false;
  try {
    const locations = await getClosetLocations();
    const idx = locations.findIndex(l => l.id === id);
    if (idx < 0) return false;
    if (updates.label !== undefined) {
      const trimmed = updates.label.trim();
      if (!trimmed) return false;
      const dup = locations.some(
        (l, i) => i !== idx && l.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (dup) return false;
      locations[idx].label = trimmed;
    }
    if (updates.color !== undefined) {
      locations[idx].color = updates.color;
    }
    await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    return true;
  } catch (err) {
    console.error('[TripsStorage] updateClosetLocation failed:', err);
    return false;
  }
}

export async function removeClosetLocation(id: string): Promise<boolean> {
  if (id === 'home') return false;
  try {
    const locations = await getClosetLocations();
    const filtered = locations.filter(l => l.id !== id);
    await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(filtered));
    // Reassign trips using this location to 'home'
    const trips = await getTrips();
    let tripsChanged = false;
    for (const trip of trips) {
      if (trip.startingLocationId === id) {
        trip.startingLocationId = 'home';
        trip.startingLocationLabel = 'Home';
        tripsChanged = true;
      }
    }
    if (tripsChanged) {
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    }
    return true;
  } catch (err) {
    console.error('[TripsStorage] removeClosetLocation failed:', err);
    return false;
  }
}
