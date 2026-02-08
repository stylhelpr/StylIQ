import AsyncStorage from '@react-native-async-storage/async-storage';
import {Trip, ClosetLocation} from '../../types/trips';

const TRIPS_KEY = '@styliq_trips';
const LOCATIONS_KEY = '@styliq_closet_locations';

const DEFAULT_LOCATIONS: ClosetLocation[] = [
  {id: 'home', label: 'Home'},
  {id: 'office', label: 'Office'},
  {id: 'parents', label: "Parents' House"},
  {id: 'partner', label: "Partner's Place"},
];

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

export async function saveTrip(trip: Trip): Promise<void> {
  const trips = await getTrips();
  trips.unshift(trip);
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export async function updateTrip(updated: Trip): Promise<void> {
  const trips = await getTrips();
  const idx = trips.findIndex(t => t.id === updated.id);
  if (idx >= 0) {
    trips[idx] = updated;
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }
}

export async function deleteTrip(id: string): Promise<void> {
  const trips = await getTrips();
  const filtered = trips.filter(t => t.id !== id);
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(filtered));
}

// ── Closet Locations ──

export async function getClosetLocations(): Promise<ClosetLocation[]> {
  const raw = await AsyncStorage.getItem(LOCATIONS_KEY);
  if (!raw) return DEFAULT_LOCATIONS;
  try {
    const locations = JSON.parse(raw) as ClosetLocation[];
    return locations.length > 0 ? locations : DEFAULT_LOCATIONS;
  } catch {
    return DEFAULT_LOCATIONS;
  }
}

export async function addClosetLocation(
  label: string,
): Promise<ClosetLocation> {
  const locations = await getClosetLocations();
  const newLoc: ClosetLocation = {
    id: `custom_${Date.now()}`,
    label: label.trim(),
  };
  locations.push(newLoc);
  await AsyncStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  return newLoc;
}
