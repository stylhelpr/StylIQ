import type {WardrobeItem} from './wardrobe';

export type CalendarOutfit = {
  id: string;
  name?: string;
  top?: WardrobeItem;
  bottom?: WardrobeItem;
  shoes?: WardrobeItem;
  createdAt: string;
  scheduled_for: string;
  tags?: string[];
  notes?: string;
  rating?: number;
};

export type CalendarMap = {
  [date: string]: CalendarOutfit;
};

export const CALENDAR_KEY = 'calendarOutfits';
