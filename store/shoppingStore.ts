import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ShoppingItem = {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  screenshot?: string; // Base64 encoded webpage screenshot for preview
  price?: number;
  priceHistory?: {price: number; date: number}[]; // GOLD #4
  brand?: string;
  category?: string; // GOLD #2: shoes, tops, dresses, etc
  source: string; // e.g., 'ASOS', 'Amazon', 'Zara'
  addedAt: number;
  lastViewed?: number;
  viewCount?: number; // GOLD #6: times revisited
  sizesViewed?: string[]; // GOLD #7: what sizes they clicked
  colorsViewed?: string[]; // GOLD #10: actual colors clicked
  emotionAtSave?: string; // GOLD #5: mood when saved (from Mentalist)
};

export type BrowsingHistory = {
  url: string;
  title: string;
  source: string;
  visitedAt: number;
  visitCount: number;
  sessionId?: string; // GOLD #3: group related browsing
  dwellTime?: number; // GOLD #1: seconds on page
  scrollDepth?: number; // GOLD #9: 0-100%
  isCartPage?: boolean; // GOLD #3b: detect /cart URLs
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
  bodyMeasurementsAtTime?: any; // GOLD #8: their measurements when viewing
  sessionId?: string;
};

export type CartEvent = {
  type: 'add' | 'remove' | 'checkout_start' | 'checkout_complete' | 'cart_view';
  timestamp: number;
  cartUrl: string;
  itemCount?: number;
  cartValue?: number;
  items?: {title: string; price?: number; quantity?: number}[];
};

export type ProductInteraction = {
  id: string;
  productUrl: string;
  type: 'view' | 'add_to_cart' | 'bookmark';
  timestamp: number;
  sessionId?: string;
  bodyMeasurementsAtTime?: any; // GOLD #8: their measurements when interacting
  cartTimeline?: CartEvent[]; // GOLD: Cart abandonment tracking
};

// Password Manager
export type SavedPassword = {
  id: string;
  domain: string; // e.g., 'amazon.com'
  username: string;
  password: string; // encrypted in production
  savedAt: number;
};

// Form Auto-fill
export type SavedAddress = {
  id: string;
  name: string; // "Home", "Work"
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  savedAt: number;
};

export type SavedCard = {
  id: string;
  name: string; // "Visa", "Amex"
  lastFour: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  savedAt: number;
  // Full card number should NEVER be stored (PCI compliance)
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
  searchHistory: (query: string) => BrowsingHistory[]; // Full-text search

  // Password Manager
  savedPasswords: SavedPassword[];
  addPassword: (domain: string, username: string, password: string) => void;
  getPasswordForDomain: (domain: string) => SavedPassword | undefined;
  removePassword: (id: string) => void;

  // Form Auto-fill - Addresses
  savedAddresses: SavedAddress[];
  addAddress: (address: Omit<SavedAddress, 'id' | 'savedAt'>) => void;
  removeAddress: (id: string) => void;

  // Form Auto-fill - Cards
  savedCards: SavedCard[];
  addCard: (card: Omit<SavedCard, 'id' | 'savedAt'>) => void;
  removeCard: (id: string) => void;

  // Collections/Wishlists
  collections: Collection[];
  createCollection: (
    name: string,
    description?: string,
    color?: string,
  ) => void;
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
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeAllTabs: () => void;

  // Insights & Analytics
  favoriteShops: string[]; // Most visited/bookmarked shops
  recentSearches: string[];
  addSearch: (query: string) => void;
  clearSearches: () => void;

  // Preferences
  defaultShoppingSites: string[];
  updateDefaultSites: (sites: string[]) => void;

  // GOLD: Session & Interaction Tracking
  currentSessionId: string | null;
  productInteractions: ProductInteraction[];
  startSession: () => void;
  endSession: () => void;
  recordProductInteraction: (
    productUrl: string,
    type: 'view' | 'add_to_cart' | 'bookmark',
    bodyMeasurements?: any,
  ) => void;

  // GOLD: Cart Abandonment & Purchase Tracking
  cartHistory: {
    cartUrl: string;
    events: CartEvent[];
    abandoned: boolean;
    timeToCheckout?: number;
  }[];
  recordCartEvent: (event: CartEvent) => void;
  getCartAbandonmentStats: () => {
    totalCarts: number;
    abandonedCarts: number;
    avgTimeToCheckout: number;
  };

  // GOLD: Update enriched data
  updateBookmarkMetadata: (
    bookmarkId: string,
    metadata: Partial<ShoppingItem>,
  ) => void;
  updateHistoryMetadata: (
    historyUrl: string,
    metadata: Partial<BrowsingHistory>,
  ) => void;

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
      searchHistory: (query: string) => {
        const q = query.toLowerCase();
        return get().history.filter(
          h =>
            h.title.toLowerCase().includes(q) ||
            h.url.toLowerCase().includes(q) ||
            h.source.toLowerCase().includes(q),
        );
      },

      // Password Manager
      savedPasswords: [],
      addPassword: (domain: string, username: string, password: string) => {
        set(state => ({
          savedPasswords: [
            {
              id: `pwd_${Date.now()}`,
              domain,
              username,
              password,
              savedAt: Date.now(),
            },
            ...state.savedPasswords,
          ],
        }));
      },
      getPasswordForDomain: (domain: string) => {
        return get().savedPasswords.find(
          p => p.domain.includes(domain) || domain.includes(p.domain),
        );
      },
      removePassword: (id: string) => {
        set(state => ({
          savedPasswords: state.savedPasswords.filter(p => p.id !== id),
        }));
      },

      // Form Auto-fill - Addresses
      savedAddresses: [],
      addAddress: (address: Omit<SavedAddress, 'id' | 'savedAt'>) => {
        set(state => ({
          savedAddresses: [
            {
              ...address,
              id: `addr_${Date.now()}`,
              savedAt: Date.now(),
            },
            ...state.savedAddresses,
          ],
        }));
      },
      removeAddress: (id: string) => {
        set(state => ({
          savedAddresses: state.savedAddresses.filter(a => a.id !== id),
        }));
      },

      // Form Auto-fill - Cards
      savedCards: [],
      addCard: (card: Omit<SavedCard, 'id' | 'savedAt'>) => {
        set(state => ({
          savedCards: [
            {
              ...card,
              id: `card_${Date.now()}`,
              savedAt: Date.now(),
            },
            ...state.savedCards,
          ],
        }));
      },
      removeCard: (id: string) => {
        set(state => ({
          savedCards: state.savedCards.filter(c => c.id !== id),
        }));
      },

      // Collections
      collections: [],
      createCollection: (
        name: string,
        description?: string,
        color = '#6366f1',
      ) => {
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
                items: exists
                  ? c.items
                  : [{...item, addedAt: Date.now()}, ...c.items],
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
          tabs: state.tabs.map(t => (t.id === id ? {...t, id, url, title} : t)),
        }));
      },
      updateTabScreenshot: (id: string, screenshot: string) => {
        set(state => ({
          tabs: state.tabs.map(t => (t.id === id ? {...t, screenshot} : t)),
        }));
      },
      reorderTabs: (fromIndex: number, toIndex: number) => {
        set(state => {
          const newTabs = [...state.tabs];
          const [movedTab] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, movedTab);
          return {tabs: newTabs};
        });
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

      // GOLD: Session & Interaction Tracking
      currentSessionId: null,
      productInteractions: [],
      startSession: () => {
        const sessionId = `session_${Date.now()}`;
        set({currentSessionId: sessionId});
      },
      endSession: () => {
        set({currentSessionId: null});
      },
      recordProductInteraction: (
        productUrl: string,
        type: 'view' | 'add_to_cart' | 'bookmark',
        bodyMeasurements?: any,
      ) => {
        set(state => ({
          productInteractions: [
            {
              id: `interaction_${Date.now()}`,
              productUrl,
              type,
              timestamp: Date.now(),
              sessionId: state.currentSessionId || undefined,
              bodyMeasurementsAtTime: bodyMeasurements,
            },
            ...state.productInteractions,
          ].slice(0, 500), // Keep last 500 interactions
        }));
      },

      // GOLD: Cart Abandonment Tracking
      cartHistory: [],
      recordCartEvent: (event: CartEvent) => {
        set(state => {
          const cartUrl = event.cartUrl;
          let updatedHistory = [...state.cartHistory];

          // Find existing cart session or create new one
          let cartSession = updatedHistory.find(
            c => c.cartUrl === cartUrl && !c.abandoned,
          );

          if (!cartSession) {
            cartSession = {
              cartUrl,
              events: [],
              abandoned: false,
              timeToCheckout: undefined,
            };
            updatedHistory.push(cartSession);
          }

          // Add event to timeline
          cartSession.events.push(event);

          // Update cart status based on event type
          if (event.type === 'checkout_complete') {
            const firstAdd = cartSession.events.find(e => e.type === 'add');
            if (firstAdd) {
              cartSession.timeToCheckout = event.timestamp - firstAdd.timestamp;
            }
          } else if (event.type === 'checkout_start') {
            const firstAdd = cartSession.events.find(e => e.type === 'add');
            if (firstAdd) {
              cartSession.timeToCheckout = event.timestamp - firstAdd.timestamp;
            }
          }

          return {
            cartHistory: updatedHistory.slice(0, 100), // Keep last 100 carts
          };
        });
      },

      getCartAbandonmentStats: () => {
        const state = get();
        const totalCarts = state.cartHistory.length;
        const abandonedCarts = state.cartHistory.filter(
          c => !c.events.some(e => e.type === 'checkout_complete'),
        ).length;
        const checkoutTimes = state.cartHistory
          .filter(c => c.timeToCheckout !== undefined)
          .map(c => c.timeToCheckout || 0);
        const avgTimeToCheckout =
          checkoutTimes.length > 0
            ? Math.round(
                checkoutTimes.reduce((a, b) => a + b, 0) / checkoutTimes.length,
              )
            : 0;

        return {
          totalCarts,
          abandonedCarts,
          avgTimeToCheckout,
        };
      },

      updateBookmarkMetadata: (
        bookmarkId: string,
        metadata: Partial<ShoppingItem>,
      ) => {
        set(state => ({
          bookmarks: state.bookmarks.map(b =>
            b.id === bookmarkId ? {...b, ...metadata} : b,
          ),
        }));
      },
      updateHistoryMetadata: (
        historyUrl: string,
        metadata: Partial<BrowsingHistory>,
      ) => {
        set(state => ({
          history: state.history.map(h =>
            h.url === historyUrl ? {...h, ...metadata} : h,
          ),
        }));
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
        productInteractions: state.productInteractions,
        cartHistory: state.cartHistory,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          console.log(
            'Shopping store rehydrated, tabs:',
            state.tabs?.length || 0,
          );
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
