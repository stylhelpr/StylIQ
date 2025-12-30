import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedNote = {
  id: string;
  user_id: string;
  url?: string;
  title?: string;
  content?: string;
  tags?: string[];
  color?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

type NotesState = {
  notes: SavedNote[];
  lastFetchedAt: number | null;
  isStale: boolean;

  // Actions
  setNotes: (notes: SavedNote[]) => void;
  addNote: (note: SavedNote) => void;
  updateNote: (id: string, updates: Partial<SavedNote>) => void;
  removeNote: (id: string) => void;
  markStale: () => void;
  clearNotes: () => void;
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      lastFetchedAt: null,
      isStale: true,

      setNotes: (notes: SavedNote[]) =>
        set({
          notes,
          lastFetchedAt: Date.now(),
          isStale: false,
        }),

      addNote: (note: SavedNote) =>
        set(state => ({
          notes: [note, ...state.notes],
        })),

      updateNote: (id: string, updates: Partial<SavedNote>) =>
        set(state => ({
          notes: state.notes.map(n =>
            n.id === id ? {...n, ...updates, updated_at: new Date().toISOString()} : n,
          ),
        })),

      removeNote: (id: string) =>
        set(state => ({
          notes: state.notes.filter(n => n.id !== id),
        })),

      markStale: () => set({isStale: true}),

      clearNotes: () =>
        set({
          notes: [],
          lastFetchedAt: null,
          isStale: true,
        }),
    }),
    {
      name: 'styliq-notes-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        notes: state.notes,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);

// Helper to check if cache is fresh
export const isNotesCacheFresh = (): boolean => {
  const {lastFetchedAt, isStale} = useNotesStore.getState();
  if (isStale || !lastFetchedAt) return false;
  return Date.now() - lastFetchedAt < STALE_TIME;
};
