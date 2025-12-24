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

  // AI Shopping Assistant
  aiShoppingAssistantSuggestions: any[];
  setAiShoppingAssistantSuggestions: (suggestions: any[]) => void;
  clearAiShoppingAssistantSuggestions: () => void;
  hasAiSuggestionsLoaded: boolean;
  setHasAiSuggestionsLoaded: (loaded: boolean) => void;
  aiSuggestionsCachedAt: number | null;
  isAiSuggestionsStale: () => boolean;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;

  // Tracking Consent (GDPR/Privacy)
  trackingConsent: 'pending' | 'accepted' | 'declined';
  setTrackingConsent: (consent: 'accepted' | 'declined') => void;
  isTrackingEnabled: () => boolean;

  // Server Sync
  lastSyncTimestamp: number | null;
  isSyncing: boolean;
  syncError: string | null;
  pendingChanges: {
    bookmarks: ShoppingItem[];
    deletedBookmarkUrls: string[];
    history: BrowsingHistory[];
    collections: Collection[];
    deletedCollectionIds: string[];
  };
  markBookmarkForSync: (bookmark: ShoppingItem) => void;
  markBookmarkDeleted: (url: string) => void;
  markHistoryForSync: (entry: BrowsingHistory) => void;
  markCollectionForSync: (collection: Collection) => void;
  markCollectionDeleted: (id: string) => void;
  setSyncState: (syncing: boolean, error?: string | null) => void;
  applyServerSync: (data: {
    bookmarks: ShoppingItem[];
    history: BrowsingHistory[];
    collections: Collection[];
    serverTimestamp: number;
  }) => void;
  clearPendingChanges: () => void;
  getPendingChangesForSync: () => {
    bookmarks: ShoppingItem[];
    deletedBookmarkUrls: string[];
    history: BrowsingHistory[];
    collections: Collection[];
    deletedCollectionIds: string[];
  };

  // Reset all user data on logout
  resetForLogout: () => void;
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
          const newBookmark = {...item, addedAt: Date.now()};
          return {
            bookmarks: [newBookmark, ...state.bookmarks],
            // Mark for sync
            pendingChanges: {
              ...state.pendingChanges,
              bookmarks: [...state.pendingChanges.bookmarks, newBookmark],
            },
          };
        });
      },
      removeBookmark: (id: string) => {
        set(state => {
          const bookmark = state.bookmarks.find(b => b.id === id);
          return {
            bookmarks: state.bookmarks.filter(b => b.id !== id),
            // Mark for sync deletion
            pendingChanges: bookmark
              ? {
                  ...state.pendingChanges,
                  bookmarks: state.pendingChanges.bookmarks.filter(
                    b => b.url !== bookmark.url,
                  ),
                  deletedBookmarkUrls:
                    state.pendingChanges.deletedBookmarkUrls.includes(
                      bookmark.url,
                    )
                      ? state.pendingChanges.deletedBookmarkUrls
                      : [
                          ...state.pendingChanges.deletedBookmarkUrls,
                          bookmark.url,
                        ],
                }
              : state.pendingChanges,
          };
        });
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
            const updatedEntry = {
              ...existing,
              visitedAt: Date.now(),
              visitCount: existing.visitCount + 1,
            };
            return {
              history: [
                updatedEntry,
                ...state.history.filter(h => h.url !== url),
              ].slice(0, 100), // Keep last 100 visits
              // Mark for sync
              pendingChanges: {
                ...state.pendingChanges,
                history: [
                  ...state.pendingChanges.history.filter(h => h.url !== url),
                  updatedEntry,
                ],
              },
            };
          }
          const newEntry: BrowsingHistory = {
            url,
            title,
            source,
            visitedAt: Date.now(),
            visitCount: 1,
          };
          return {
            history: [newEntry, ...state.history].slice(0, 100),
            // Mark for sync
            pendingChanges: {
              ...state.pendingChanges,
              history: [...state.pendingChanges.history, newEntry],
            },
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
          // Mark for sync
          pendingChanges: {
            ...state.pendingChanges,
            collections: [...state.pendingChanges.collections, collection],
          },
        }));
      },
      deleteCollection: (id: string) => {
        set(state => ({
          collections: state.collections.filter(c => c.id !== id),
          // Mark for sync deletion
          pendingChanges: {
            ...state.pendingChanges,
            collections: state.pendingChanges.collections.filter(
              c => c.id !== id,
            ),
            deletedCollectionIds:
              state.pendingChanges.deletedCollectionIds.includes(id)
                ? state.pendingChanges.deletedCollectionIds
                : [...state.pendingChanges.deletedCollectionIds, id],
          },
        }));
      },
      addItemToCollection: (collectionId: string, item: ShoppingItem) => {
        set(state => {
          const updatedCollections = state.collections.map(c => {
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
          });
          const updatedCollection = updatedCollections.find(
            c => c.id === collectionId,
          );
          return {
            collections: updatedCollections,
            // Mark collection for sync
            pendingChanges: updatedCollection
              ? {
                  ...state.pendingChanges,
                  collections: [
                    ...state.pendingChanges.collections.filter(
                      c => c.id !== collectionId,
                    ),
                    updatedCollection,
                  ],
                }
              : state.pendingChanges,
          };
        });
      },
      removeItemFromCollection: (collectionId: string, itemId: string) => {
        set(state => {
          const updatedCollections = state.collections.map(c => {
            if (c.id === collectionId) {
              return {
                ...c,
                items: c.items.filter(i => i.id !== itemId),
                updatedAt: Date.now(),
              };
            }
            return c;
          });
          const updatedCollection = updatedCollections.find(
            c => c.id === collectionId,
          );
          return {
            collections: updatedCollections,
            // Mark collection for sync
            pendingChanges: updatedCollection
              ? {
                  ...state.pendingChanges,
                  collections: [
                    ...state.pendingChanges.collections.filter(
                      c => c.id !== collectionId,
                    ),
                    updatedCollection,
                  ],
                }
              : state.pendingChanges,
          };
        });
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

      // AI Shopping Assistant
      aiShoppingAssistantSuggestions: [],
      setAiShoppingAssistantSuggestions: (suggestions: any[]) => {
        set({
          aiShoppingAssistantSuggestions: suggestions,
          aiSuggestionsCachedAt: Date.now(),
        });
      },
      clearAiShoppingAssistantSuggestions: () => {
        set({
          aiShoppingAssistantSuggestions: [],
          aiSuggestionsCachedAt: null,
        });
      },
      hasAiSuggestionsLoaded: false,
      setHasAiSuggestionsLoaded: (loaded: boolean) => {
        set({hasAiSuggestionsLoaded: loaded});
      },
      aiSuggestionsCachedAt: null,
      isAiSuggestionsStale: () => {
        const state = get();
        if (!state.aiSuggestionsCachedAt) return true;
        const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24-hour cache for production efficiency
        return Date.now() - state.aiSuggestionsCachedAt > CACHE_DURATION_MS;
      },

      // Hydration
      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => {
        set({_hasHydrated: hasHydrated});
      },

      // Tracking Consent (GDPR/Privacy)
      trackingConsent: 'pending' as 'pending' | 'accepted' | 'declined',
      setTrackingConsent: (consent: 'accepted' | 'declined') => {
        set({trackingConsent: consent});
      },
      isTrackingEnabled: () => {
        return get().trackingConsent === 'accepted';
      },

      // Server Sync State & Methods
      lastSyncTimestamp: null,
      isSyncing: false,
      syncError: null,
      pendingChanges: {
        bookmarks: [],
        deletedBookmarkUrls: [],
        history: [],
        collections: [],
        deletedCollectionIds: [],
      },

      markBookmarkForSync: (bookmark: ShoppingItem) => {
        set(state => {
          const existing = state.pendingChanges.bookmarks.find(
            b => b.url === bookmark.url,
          );
          if (existing) {
            return {
              pendingChanges: {
                ...state.pendingChanges,
                bookmarks: state.pendingChanges.bookmarks.map(b =>
                  b.url === bookmark.url ? bookmark : b,
                ),
              },
            };
          }
          return {
            pendingChanges: {
              ...state.pendingChanges,
              bookmarks: [...state.pendingChanges.bookmarks, bookmark],
            },
          };
        });
      },

      markBookmarkDeleted: (url: string) => {
        set(state => ({
          pendingChanges: {
            ...state.pendingChanges,
            // Remove from pending bookmarks if it was there
            bookmarks: state.pendingChanges.bookmarks.filter(b => b.url !== url),
            // Add to deleted list if not already there
            deletedBookmarkUrls: state.pendingChanges.deletedBookmarkUrls.includes(
              url,
            )
              ? state.pendingChanges.deletedBookmarkUrls
              : [...state.pendingChanges.deletedBookmarkUrls, url],
          },
        }));
      },

      markHistoryForSync: (entry: BrowsingHistory) => {
        set(state => {
          const existing = state.pendingChanges.history.find(
            h => h.url === entry.url,
          );
          if (existing) {
            return {
              pendingChanges: {
                ...state.pendingChanges,
                history: state.pendingChanges.history.map(h =>
                  h.url === entry.url ? entry : h,
                ),
              },
            };
          }
          return {
            pendingChanges: {
              ...state.pendingChanges,
              history: [...state.pendingChanges.history, entry],
            },
          };
        });
      },

      markCollectionForSync: (collection: Collection) => {
        set(state => {
          const existing = state.pendingChanges.collections.find(
            c => c.id === collection.id,
          );
          if (existing) {
            return {
              pendingChanges: {
                ...state.pendingChanges,
                collections: state.pendingChanges.collections.map(c =>
                  c.id === collection.id ? collection : c,
                ),
              },
            };
          }
          return {
            pendingChanges: {
              ...state.pendingChanges,
              collections: [...state.pendingChanges.collections, collection],
            },
          };
        });
      },

      markCollectionDeleted: (id: string) => {
        set(state => ({
          pendingChanges: {
            ...state.pendingChanges,
            // Remove from pending collections if it was there
            collections: state.pendingChanges.collections.filter(c => c.id !== id),
            // Add to deleted list if not already there
            deletedCollectionIds: state.pendingChanges.deletedCollectionIds.includes(
              id,
            )
              ? state.pendingChanges.deletedCollectionIds
              : [...state.pendingChanges.deletedCollectionIds, id],
          },
        }));
      },

      setSyncState: (syncing: boolean, error?: string | null) => {
        set({
          isSyncing: syncing,
          syncError: error ?? null,
        });
      },

      applyServerSync: (data: {
        bookmarks: ShoppingItem[];
        history: BrowsingHistory[];
        collections: Collection[];
        serverTimestamp: number;
      }) => {
        set({
          bookmarks: data.bookmarks,
          history: data.history,
          collections: data.collections,
          lastSyncTimestamp: data.serverTimestamp,
          syncError: null,
        });
      },

      clearPendingChanges: () => {
        set({
          pendingChanges: {
            bookmarks: [],
            deletedBookmarkUrls: [],
            history: [],
            collections: [],
            deletedCollectionIds: [],
          },
        });
      },

      getPendingChangesForSync: () => {
        return get().pendingChanges;
      },

      // Reset all user data on logout
      resetForLogout: () => {
        set({
          bookmarks: [],
          history: [],
          collections: [],
          tabs: [],
          currentTabId: null,
          recentSearches: [],
          favoriteShops: [],
          productInteractions: [],
          cartHistory: [],
          currentSessionId: null,
          aiShoppingAssistantSuggestions: [],
          hasAiSuggestionsLoaded: false,
          aiSuggestionsCachedAt: null,
          // CRITICAL: Clear sensitive data
          savedPasswords: [],
          savedAddresses: [],
          savedCards: [],
          // Clear sync state
          lastSyncTimestamp: null,
          isSyncing: false,
          syncError: null,
          pendingChanges: {
            bookmarks: [],
            deletedBookmarkUrls: [],
            history: [],
            collections: [],
            deletedCollectionIds: [],
          },
        });
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
        aiShoppingAssistantSuggestions: state.aiShoppingAssistantSuggestions,
        hasAiSuggestionsLoaded: state.hasAiSuggestionsLoaded,
        aiSuggestionsCachedAt: state.aiSuggestionsCachedAt,
        trackingConsent: state.trackingConsent,
        // Sync state (persisted for offline support)
        lastSyncTimestamp: state.lastSyncTimestamp,
        pendingChanges: state.pendingChanges,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
