import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EventPromptResponse {
  eventId: string;
  response: 'yes' | 'no'; // yes = style it, no = not now
  timestamp: number;
}

interface CalendarEventPromptState {
  // Track which events user has already answered
  answeredEvents: Record<string, EventPromptResponse>;

  // Check if event has been answered
  hasAnswered: (eventId: string) => boolean;

  // Record user's response to event prompt
  recordResponse: (eventId: string, response: 'yes' | 'no') => Promise<void>;

  // Load persisted responses from storage
  loadFromStorage: () => Promise<void>;

  // Clear all responses
  clearResponses: () => Promise<void>;
}

export const useCalendarEventPromptStore = create<CalendarEventPromptState>(
  (set, get) => ({
    answeredEvents: {},

    hasAnswered: (eventId: string) => {
      const {answeredEvents} = get();
      return eventId in answeredEvents;
    },

    recordResponse: async (eventId: string, response: 'yes' | 'no') => {
      const newResponse: EventPromptResponse = {
        eventId,
        response,
        timestamp: Date.now(),
      };

      set(state => ({
        answeredEvents: {
          ...state.answeredEvents,
          [eventId]: newResponse,
        },
      }));

      // Persist to AsyncStorage
      try {
        const {answeredEvents} = get();
        await AsyncStorage.setItem(
          'calendarEventPrompts',
          JSON.stringify(answeredEvents),
        );
      } catch (err) {
        console.warn('❌ Failed to persist event prompt response:', err);
      }
    },

    loadFromStorage: async () => {
      try {
        const stored = await AsyncStorage.getItem('calendarEventPrompts');
        if (stored) {
          const parsed = JSON.parse(stored);
          set({answeredEvents: parsed});
        }
      } catch (err) {
        console.warn('❌ Failed to load event prompt responses:', err);
      }
    },

    clearResponses: async () => {
      set({answeredEvents: {}});
      try {
        await AsyncStorage.removeItem('calendarEventPrompts');
      } catch (err) {
        console.warn('❌ Failed to clear event prompt responses:', err);
      }
    },
  }),
);
