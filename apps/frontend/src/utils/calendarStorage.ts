import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarMap,
  CalendarOutfit,
  CALENDAR_KEY,
} from '../types/calendarTypes';

export const saveOutfitToDate = async (
  date: string,
  outfit: CalendarOutfit,
) => {
  const raw = await AsyncStorage.getItem(CALENDAR_KEY);
  const map: CalendarMap = raw ? JSON.parse(raw) : {};
  map[date] = outfit;
  await AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(map));
};

export const getOutfitByDate = async (
  date: string,
): Promise<CalendarOutfit | null> => {
  const raw = await AsyncStorage.getItem(CALENDAR_KEY);
  if (!raw) return null;
  const map: CalendarMap = JSON.parse(raw);
  return map[date] || null;
};

export const getAllPlannedOutfits = async (): Promise<CalendarMap> => {
  const raw = await AsyncStorage.getItem(CALENDAR_KEY);
  return raw ? JSON.parse(raw) : {};
};
