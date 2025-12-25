// apps/frontend/src/services/browserSyncService.ts
import {API_BASE_URL} from '../config/api';
import {
  useShoppingStore,
  ShoppingItem,
  BrowsingHistory,
  Collection,
  CartEvent,
  ProductInteraction,
} from '../../../../store/shoppingStore';

// Local cart history type (matches store structure)
type LocalCartHistory = {
  cartUrl: string;
  events: CartEvent[];
  abandoned: boolean;
  timeToCheckout?: number;
};

// Server response types (different from local store types)
type ServerBookmark = {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  price?: number;
  priceHistory?: {price: number; date: number}[];
  brand?: string;
  category?: string;
  source: string;
  sizesViewed?: string[];
  colorsViewed?: string[];
  viewCount?: number;
  lastViewedAt?: number;
  emotionAtSave?: string; // GOLD #5
  bodyMeasurementsAtTime?: any; // GOLD #8
  createdAt: number;
  updatedAt: number;
};

type ServerHistory = {
  id: string;
  url: string;
  title: string;
  source: string;
  dwellTimeSeconds?: number;
  scrollDepthPercent?: number;
  visitCount: number;
  visitedAt: number;
  brand?: string;
  sessionId?: string; // GOLD #3
  isCartPage?: boolean; // GOLD #3b
  bodyMeasurementsAtTime?: any; // GOLD #8
};

type ServerCollection = {
  id: string;
  name: string;
  description?: string;
  color: string;
  bookmarkIds: string[];
  createdAt: number;
  updatedAt: number;
};

type ServerCartEvent = {
  type: 'add' | 'remove' | 'checkout_start' | 'checkout_complete' | 'cart_view';
  timestamp: number;
  cartUrl: string;
  itemCount?: number;
  cartValue?: number;
  items?: {title: string; price?: number; quantity?: number}[];
};

type ServerCartHistory = {
  id: string;
  cartUrl: string;
  events: ServerCartEvent[];
  abandoned: boolean;
  timeToCheckout?: number;
  createdAt: number;
  updatedAt: number;
};

type ServerSyncResponse = {
  bookmarks: ServerBookmark[];
  history: ServerHistory[];
  collections: ServerCollection[];
  cartHistory: ServerCartHistory[];
  serverTimestamp: number;
};

type SyncResponse = {
  bookmarks: ShoppingItem[];
  history: BrowsingHistory[];
  collections: Collection[];
  cartHistory: LocalCartHistory[];
  serverTimestamp: number;
};

// GOLD: Time-to-action event for sync
type TimeToActionEvent = {
  sessionId?: string;
  productUrl: string;
  actionType: 'bookmark' | 'cart';
  seconds: number;
  timestamp: number;
};

// GOLD: Product interaction for sync
type ProductInteractionEvent = {
  sessionId?: string;
  productUrl: string;
  interactionType: string;
  metadata?: Record<string, any>;
  bodyMeasurementsAtTime?: any;
  timestamp: number;
};

type SyncRequest = {
  bookmarks: ShoppingItem[];
  deletedBookmarkUrls: string[];
  history: BrowsingHistory[];
  collections: Collection[];
  deletedCollectionIds: string[];
  cartHistory: LocalCartHistory[];
  timeToActionEvents?: TimeToActionEvent[];
  productInteractions?: ProductInteractionEvent[];
};

// Map server bookmark to local ShoppingItem format
function mapServerBookmarkToLocal(bookmark: ServerBookmark): ShoppingItem {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    imageUrl: bookmark.faviconUrl,
    price: bookmark.price,
    priceHistory: bookmark.priceHistory,
    brand: bookmark.brand,
    category: bookmark.category,
    source: bookmark.source,
    sizesViewed: bookmark.sizesViewed,
    colorsViewed: bookmark.colorsViewed,
    viewCount: bookmark.viewCount,
    lastViewed: bookmark.lastViewedAt,
    emotionAtSave: bookmark.emotionAtSave, // GOLD #5
    addedAt: bookmark.createdAt,
  };
}

// Map server history to local BrowsingHistory format
function mapServerHistoryToLocal(history: ServerHistory): BrowsingHistory {
  return {
    url: history.url,
    title: history.title,
    source: history.source,
    dwellTime: history.dwellTimeSeconds,
    scrollDepth: history.scrollDepthPercent,
    visitCount: history.visitCount,
    visitedAt: history.visitedAt,
    brand: history.brand,
    sessionId: history.sessionId, // GOLD #3
    isCartPage: history.isCartPage, // GOLD #3b
  };
}

// Map server collection to local Collection format
function mapServerCollectionToLocal(
  collection: ServerCollection,
  bookmarks: ShoppingItem[],
): Collection {
  // Find the actual bookmark items that belong to this collection
  const items = collection.bookmarkIds
    .map(id => bookmarks.find(b => b.id === id))
    .filter((b): b is ShoppingItem => b !== undefined);

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    color: collection.color,
    items,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

// Map server cart history to local format
function mapServerCartHistoryToLocal(
  cart: ServerCartHistory,
): LocalCartHistory {
  return {
    cartUrl: cart.cartUrl,
    events: cart.events.map(e => ({
      type: e.type,
      timestamp: e.timestamp,
      cartUrl: e.cartUrl,
      itemCount: e.itemCount,
      cartValue: e.cartValue,
      items: e.items,
    })),
    abandoned: cart.abandoned,
    timeToCheckout: cart.timeToCheckout,
  };
}

// Transform full server response to local format
function mapServerResponseToLocal(response: ServerSyncResponse): SyncResponse {
  const bookmarks = response.bookmarks.map(mapServerBookmarkToLocal);
  const history = response.history.map(mapServerHistoryToLocal);
  const collections = response.collections.map(c =>
    mapServerCollectionToLocal(c, bookmarks),
  );
  const cartHistory = (response.cartHistory || []).map(
    mapServerCartHistoryToLocal,
  );

  return {
    bookmarks,
    history,
    collections,
    cartHistory,
    serverTimestamp: response.serverTimestamp,
  };
}

class BrowserSyncService {
  // API_BASE_URL already includes /api suffix
  private baseUrl = API_BASE_URL || 'http://localhost:3001/api';

  /**
   * Perform full sync - pulls all data from server
   * Use on first app open or when local data is missing
   */
  async fullSync(accessToken: string): Promise<SyncResponse | null> {
    const store = useShoppingStore.getState();

    try {
      store.setSyncState(true);

      const response = await fetch(`${this.baseUrl}/browser-sync`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const serverData: ServerSyncResponse = await response.json();
      const data = mapServerResponseToLocal(serverData);

      // Apply server data to local store
      store.applyServerSync(data);
      store.clearPendingChanges();
      store.setSyncState(false);

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';
      store.setSyncState(false, message);
      return null;
    }
  }

  /**
   * Perform delta sync - pulls only changes since last sync
   * Use for subsequent syncs to minimize data transfer
   */
  async deltaSync(accessToken: string): Promise<SyncResponse | null> {
    const store = useShoppingStore.getState();
    const lastSync = store.lastSyncTimestamp;

    // If no previous sync, do full sync
    if (!lastSync) {
      return this.fullSync(accessToken);
    }

    try {
      store.setSyncState(true);

      const response = await fetch(
        `${this.baseUrl}/browser-sync/delta?since=${lastSync}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Delta sync failed: ${response.status}`);
      }

      const serverData: ServerSyncResponse = await response.json();
      const data = mapServerResponseToLocal(serverData);

      // Merge server changes with local data
      // For simplicity, we replace with server state
      // A more sophisticated approach would merge intelligently
      store.applyServerSync(data);
      store.setSyncState(false);

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';
      store.setSyncState(false, message);
      return null;
    }
  }

  /**
   * Push local changes to server
   * Call this when there are pending changes to upload
   */
  async pushChanges(accessToken: string): Promise<SyncResponse | null> {
    const store = useShoppingStore.getState();
    const pendingChanges = store.getPendingChangesForSync();

    // Get cart history from pending changes (may not exist in older store versions)
    const pendingCartHistory = (pendingChanges as any).cartHistory || [];

    // GOLD: Get time-to-action and product interactions for sync
    const timeToActionLog = store.timeToActionLog || [];
    const productInteractions = store.productInteractions || [];

    // Check if there are any changes to push
    const hasChanges =
      pendingChanges.bookmarks.length > 0 ||
      pendingChanges.deletedBookmarkUrls.length > 0 ||
      pendingChanges.history.length > 0 ||
      pendingChanges.collections.length > 0 ||
      pendingChanges.deletedCollectionIds.length > 0 ||
      pendingCartHistory.length > 0 ||
      timeToActionLog.length > 0 ||
      productInteractions.length > 0;

    if (!hasChanges) {
      return null;
    }

    try {
      store.setSyncState(true);

      // Map local data to server format
      const requestBody: SyncRequest = {
        bookmarks: pendingChanges.bookmarks.map(b => ({
          ...b,
          // Ensure required fields are present
          id: b.id,
          url: b.url,
          title: b.title,
          source: b.source,
          addedAt: b.addedAt,
        })),
        deletedBookmarkUrls: pendingChanges.deletedBookmarkUrls,
        history: pendingChanges.history.map(h => ({
          ...h,
          url: h.url,
          title: h.title,
          source: h.source,
          visitedAt: h.visitedAt,
          visitCount: h.visitCount,
        })),
        collections: pendingChanges.collections.map(c => ({
          ...c,
          id: c.id,
          name: c.name,
          items: c.items,
          color: c.color,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        deletedCollectionIds: pendingChanges.deletedCollectionIds,
        cartHistory: pendingCartHistory.map((ch: LocalCartHistory) => ({
          cartUrl: ch.cartUrl,
          events: ch.events,
          abandoned: ch.abandoned,
          timeToCheckout: ch.timeToCheckout,
        })),
        // GOLD: Time-to-action events
        timeToActionEvents: timeToActionLog.map(e => ({
          sessionId: store.currentSessionId || undefined,
          productUrl: e.productUrl,
          actionType: e.actionType as 'bookmark' | 'cart',
          seconds: e.seconds,
          timestamp: e.timestamp,
        })),
        // GOLD: Product interactions
        productInteractions: productInteractions.map(
          (p: ProductInteraction) => ({
            sessionId: p.sessionId,
            productUrl: p.productUrl,
            interactionType: p.type,
            metadata: {},
            bodyMeasurementsAtTime: p.bodyMeasurementsAtTime,
            timestamp: p.timestamp,
          }),
        ),
      };

      const response = await fetch(`${this.baseUrl}/browser-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Push sync failed: ${response.status}`);
      }

      const serverData: ServerSyncResponse = await response.json();
      const data = mapServerResponseToLocal(serverData);

      // Apply server response and clear pending changes
      store.applyServerSync(data);
      store.clearPendingChanges();

      // GOLD: Clear synced time-to-action and product interaction buffers
      store.clearSyncedGoldMetrics();

      store.setSyncState(false);

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';
      store.setSyncState(false, message);
      return null;
    }
  }

  /**
   * Bidirectional sync - push local changes, then pull server updates
   * This is the main sync method to call on app open/background
   */
  async sync(accessToken: string): Promise<boolean> {
    try {
      // First, push any local changes
      await this.pushChanges(accessToken);

      // Then, pull updates from server
      const store = useShoppingStore.getState();

      // Do full sync if:
      // 1. No previous sync timestamp, OR
      // 2. Local data is empty (app was reinstalled or data cleared)
      const localDataEmpty =
        store.bookmarks.length === 0 &&
        store.history.length === 0 &&
        store.collections.length === 0;

      if (!store.lastSyncTimestamp || localDataEmpty) {
        await this.fullSync(accessToken);
      } else {
        await this.deltaSync(accessToken);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a single bookmark by URL
   */
  async deleteBookmark(accessToken: string, url: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/browser-sync/bookmark`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({url}),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear all browsing history on the server
   */
  async clearHistory(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/browser-sync/history`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const browserSyncService = new BrowserSyncService();
