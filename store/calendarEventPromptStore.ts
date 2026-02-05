import {create} from 'zustand';
import {UserScopedStorage} from '../apps/frontend/src/storage/userScopedStorage';
import {getActiveUserId} from '../apps/frontend/src/storage/activeUserManager';

const STORAGE_KEY = 'calendarEventPrompts';

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

  // Load persisted responses from storage (user-scoped)
  loadFromStorage: () => Promise<void>;

  // Clear all responses (user-scoped)
  clearResponses: () => Promise<void>;

  // MULTI-ACCOUNT: Reset in-memory state only (for logout)
  resetForLogout: () => void;
}

export const useCalendarEventPromptStore = create<CalendarEventPromptState>(
  (set, get) => ({
    answeredEvents: {},

    hasAnswered: (eventId: string) => {
      const {answeredEvents} = get();
      return eventId in answeredEvents;
    },

    recordResponse: async (eventId: string, response: 'yes' | 'no') => {
      const userId = await getActiveUserId();
      if (!userId) {
        console.warn('[CalendarEventPromptStore] No active user for recordResponse');
        return;
      }

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

      // Persist to user-scoped storage
      try {
        const {answeredEvents} = get();
        await UserScopedStorage.setItem(
          userId,
          STORAGE_KEY,
          JSON.stringify(answeredEvents),
        );
      } catch (err) {
        console.warn('❌ Failed to persist event prompt response:', err);
      }
    },

    loadFromStorage: async () => {
      const userId = await getActiveUserId();
      if (!userId) {
        console.warn('[CalendarEventPromptStore] No active user for loadFromStorage');
        return;
      }

      try {
        const stored = await UserScopedStorage.getItem(userId, STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({answeredEvents: parsed});
        }
      } catch (err) {
        console.warn('❌ Failed to load event prompt responses:', err);
      }
    },

    clearResponses: async () => {
      const userId = await getActiveUserId();
      set({answeredEvents: {}});

      if (!userId) {
        return;
      }

      try {
        await UserScopedStorage.removeItem(userId, STORAGE_KEY);
      } catch (err) {
        console.warn('❌ Failed to clear event prompt responses:', err);
      }
    },

    // MULTI-ACCOUNT: Reset in-memory state only (for logout)
    // Does NOT clear persisted data - that's user-scoped
    resetForLogout: () => {
      set({answeredEvents: {}});
    },
  }),
);
