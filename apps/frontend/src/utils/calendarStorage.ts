import {UserScopedStorage} from '../storage/userScopedStorage';
import {
  CalendarMap,
  CalendarOutfit,
} from '../types/calendarTypes';

const CALENDAR_KEY = 'calendarOutfits';

/**
 * Save an outfit to a specific date (user-scoped)
 */
export const saveOutfitToDate = async (
  userId: string,
  date: string,
  outfit: CalendarOutfit,
) => {
  if (!userId) {
    console.warn('[calendarStorage] saveOutfitToDate called without userId');
    return;
  }
  const raw = await UserScopedStorage.getItem(userId, CALENDAR_KEY);
  const map: CalendarMap = raw ? JSON.parse(raw) : {};
  map[date] = outfit;
  await UserScopedStorage.setItem(userId, CALENDAR_KEY, JSON.stringify(map));
};

/**
 * Get outfit for a specific date (user-scoped)
 */
export const getOutfitByDate = async (
  userId: string,
  date: string,
): Promise<CalendarOutfit | null> => {
  if (!userId) {
    console.warn('[calendarStorage] getOutfitByDate called without userId');
    return null;
  }
  const raw = await UserScopedStorage.getItem(userId, CALENDAR_KEY);
  if (!raw) return null;
  const map: CalendarMap = JSON.parse(raw);
  return map[date] || null;
};

/**
 * Get all planned outfits (user-scoped)
 */
export const getAllPlannedOutfits = async (userId: string): Promise<CalendarMap> => {
  if (!userId) {
    console.warn('[calendarStorage] getAllPlannedOutfits called without userId');
    return {};
  }
  const raw = await UserScopedStorage.getItem(userId, CALENDAR_KEY);
  return raw ? JSON.parse(raw) : {};
};

/**
 * Remove outfit for a specific date (user-scoped)
 */
export const removeOutfitForDate = async (userId: string, date: string): Promise<void> => {
  if (!userId) {
    console.warn('[calendarStorage] removeOutfitForDate called without userId');
    return;
  }
  const raw = await UserScopedStorage.getItem(userId, CALENDAR_KEY);
  if (!raw) return;
  const map: CalendarMap = JSON.parse(raw);
  delete map[date];
  await UserScopedStorage.setItem(userId, CALENDAR_KEY, JSON.stringify(map));
};

/**
 * Clear all calendar outfits (user-scoped)
 */
export const clearAllOutfits = async (userId: string): Promise<void> => {
  if (!userId) {
    console.warn('[calendarStorage] clearAllOutfits called without userId');
    return;
  }
  await UserScopedStorage.removeItem(userId, CALENDAR_KEY);
};
