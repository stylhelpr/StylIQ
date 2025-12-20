import {create} from 'zustand';

interface CalendarEventsState {
  events: any[];
  lastFetched: number | null;
  setEvents: (events: any[]) => void;
  clearEvents: () => void;
}

export const useCalendarEventsStore = create<CalendarEventsState>((set) => ({
  events: [],
  lastFetched: null,

  setEvents: (events: any[]) => {
    set({events, lastFetched: Date.now()});
  },

  clearEvents: () => {
    set({events: [], lastFetched: null});
  },
}));
