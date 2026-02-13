import AsyncStorage from '@react-native-async-storage/async-storage';
import {Trip, ClosetLocation} from '../../types/trips';

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
    return true;
  } catch (err) {
    console.error('[TripsStorage] updateTrip failed:', err);
    return false;
  }
}

export async function deleteTrip(id: string): Promise<boolean> {
  try {
    const trips = await getTrips();
    const filtered = trips.filter(t => t.id !== id);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('[TripsStorage] deleteTrip failed:', err);
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
    };
    locations.push(newLoc);
    await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    return newLoc;
  } catch (err) {
    console.error('[TripsStorage] addClosetLocation failed:', err);
    return null;
  }
}
