import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ShoppingItem = {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  price?: number;
  brand?: string;
  source: string; // e.g., 'ASOS', 'Amazon', 'Zara'
  addedAt: number;
  lastViewed?: number;
};

export type BrowsingHistory = {
  url: string;
  title: string;
  source: string;
  visitedAt: number;
  visitCount: number;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  items: ShoppingItem[];
  color: string; // Theme color for visual organization
  createdAt: number;
  updatedAt: number;
};

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  screenshot?: string; // Base64 encoded screenshot for tab preview
};

type ShoppingState = {
  // Bookmarks & Favorites
  bookmarks: ShoppingItem[];
  addBookmark: (item: ShoppingItem) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;

  // History
  history: BrowsingHistory[];
  addToHistory: (url: string, title: string, source: string) => void;
  clearHistory: () => void;
  getRecentHistory: (limit?: number) => BrowsingHistory[];
  getMostVisitedSites: (limit?: number) => BrowsingHistory[];
  getTopShops: (limit?: number) => {source: string; visits: number}[];

  // Collections/Wishlists
  collections: Collection[];
  createCollection: (name: string, description?: string, color?: string) => void;
  deleteCollection: (id: string) => void;
  addItemToCollection: (collectionId: string, item: ShoppingItem) => void;
  removeItemFromCollection: (collectionId: string, itemId: string) => void;

  // Browser Tabs
  tabs: BrowserTab[];
  currentTabId: string | null;
  addTab: (url: string, title?: string) => void;
  removeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, url: string, title: string) => void;
  updateTabScreenshot: (id: string, screenshot: string) => void;
  closeAllTabs: () => void;

  // Insights & Analytics
  favoriteShops: string[]; // Most visited/bookmarked shops
  recentSearches: string[];
  addSearch: (query: string) => void;
  clearSearches: () => void;

  // Preferences
  defaultShoppingSites: string[];
  updateDefaultSites: (sites: string[]) => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      // Bookmarks
      bookmarks: [],
      addBookmark: (item: ShoppingItem) => {
        set(state => {
          const exists = state.bookmarks.some(b => b.url === item.url);
          if (exists) return state;
          return {
            bookmarks: [{...item, addedAt: Date.now()}, ...state.bookmarks],
          };
        });
      },
      removeBookmark: (id: string) => {
        set(state => ({
          bookmarks: state.bookmarks.filter(b => b.id !== id),
        }));
      },
      isBookmarked: (url: string) => {
        return get().bookmarks.some(b => b.url === url);
      },

      // History
      history: [],
      addToHistory: (url: string, title: string, source: string) => {
        set(state => {
          const existing = state.history.find(h => h.url === url);
          if (existing) {
            return {
              history: [
                {
                  ...existing,
                  visitedAt: Date.now(),
                  visitCount: existing.visitCount + 1,
                },
                ...state.history.filter(h => h.url !== url),
              ].slice(0, 100), // Keep last 100 visits
            };
          }
          return {
            history: [
              {url, title, source, visitedAt: Date.now(), visitCount: 1},
              ...state.history,
            ].slice(0, 100),
          };
        });
      },
      clearHistory: () => set({history: []}),
      getRecentHistory: (limit = 10) => {
        return get()
          .history.sort((a, b) => b.visitedAt - a.visitedAt)
          .slice(0, limit);
      },
      getMostVisitedSites: (limit = 10) => {
        return get()
          .history.sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, limit);
      },
      getTopShops: (limit = 5) => {
        const shopCounts = new Map<string, number>();
        get().history.forEach(item => {
          const current = shopCounts.get(item.source) || 0;
          shopCounts.set(item.source, current + item.visitCount);
        });
        return Array.from(shopCounts.entries())
          .map(([source, visits]) => ({source, visits}))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, limit);
      },

      // Collections
      collections: [],
      createCollection: (name: string, description?: string, color = '#6366f1') => {
        const collection: Collection = {
          id: `col_${Date.now()}`,
          name,
          description,
          items: [],
          color,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(state => ({
          collections: [collection, ...state.collections],
        }));
      },
      deleteCollection: (id: string) => {
        set(state => ({
          collections: state.collections.filter(c => c.id !== id),
        }));
      },
      addItemToCollection: (collectionId: string, item: ShoppingItem) => {
        set(state => ({
          collections: state.collections.map(c => {
            if (c.id === collectionId) {
              const exists = c.items.some(i => i.id === item.id);
              return {
                ...c,
                items: exists ? c.items : [{...item, addedAt: Date.now()}, ...c.items],
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));
      },
      removeItemFromCollection: (collectionId: string, itemId: string) => {
        set(state => ({
          collections: state.collections.map(c => {
            if (c.id === collectionId) {
              return {
                ...c,
                items: c.items.filter(i => i.id !== itemId),
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));
      },

      // Browser Tabs
      tabs: [],
      currentTabId: null,
      addTab: (url: string, title = 'New Tab') => {
        const tabId = `tab_${Date.now()}`;
        set(state => ({
          tabs: [...state.tabs, {id: tabId, url, title}],
          currentTabId: tabId,
        }));
      },
      removeTab: (id: string) => {
        set(state => {
          const remaining = state.tabs.filter(t => t.id !== id);
          let newCurrentTabId = state.currentTabId;
          if (newCurrentTabId === id && remaining.length > 0) {
            newCurrentTabId = remaining[0].id;
          } else if (remaining.length === 0) {
            newCurrentTabId = null;
          }
          return {
            tabs: remaining,
            currentTabId: newCurrentTabId,
          };
        });
      },
      switchTab: (id: string) => {
        set({currentTabId: id});
      },
      updateTab: (id: string, url: string, title: string) => {
        set(state => ({
          tabs: state.tabs.map(t =>
            t.id === id ? {...t, id, url, title} : t,
          ),
        }));
      },
      updateTabScreenshot: (id: string, screenshot: string) => {
        set(state => ({
          tabs: state.tabs.map(t =>
            t.id === id ? {...t, screenshot} : t,
          ),
        }));
      },
      closeAllTabs: () => {
        set({tabs: [], currentTabId: null});
      },

      // Insights
      favoriteShops: [],
      recentSearches: [],
      addSearch: (query: string) => {
        set(state => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(s => s !== query),
          ].slice(0, 20),
        }));
      },
      clearSearches: () => set({recentSearches: []}),

      // Preferences
      defaultShoppingSites: [
        'ASOS',
        'Amazon',
        'H&M',
        'Zara',
        'Shein',
        'SSENSE',
        'Farfetch',
      ],
      updateDefaultSites: (sites: string[]) => {
        set({defaultShoppingSites: sites});
      },

      // Hydration
      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({_hasHydrated: hasHydrated});
      },
    }),
    {
      name: 'shopping-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: state => ({
        bookmarks: state.bookmarks,
        history: state.history,
        collections: state.collections,
        recentSearches: state.recentSearches,
        defaultShoppingSites: state.defaultShoppingSites,
        tabs: state.tabs,
        currentTabId: state.currentTabId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Shopping store rehydrated, tabs:', state.tabs?.length || 0);
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
