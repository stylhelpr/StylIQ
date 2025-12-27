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
  bookmarkUrls?: string[]; // Used for syncing - URLs are consistent between client/server
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

type ServerTab = {
  id: string;
  url: string;
  title?: string;
  position?: number;
  createdAt?: number;
  updatedAt?: number;
};

type ServerSyncResponse = {
  bookmarks: ServerBookmark[];
  history: ServerHistory[];
  collections: ServerCollection[];
  cartHistory: ServerCartHistory[];
  tabs: ServerTab[];
  currentTabId: string | null;
  serverTimestamp: number;
};

// Local tab type (matches store structure)
type LocalTab = {
  id: string;
  url: string;
  title: string;
  screenshot?: string;
};

type SyncResponse = {
  bookmarks: ShoppingItem[];
  history: BrowsingHistory[];
  collections: Collection[];
  cartHistory: LocalCartHistory[];
  tabs: LocalTab[];
  currentTabId: string | null;
  serverTimestamp: number;
};

// GOLD: Time-to-action event for sync
type TimeToActionEvent = {
  // ✅ FIX #3: IDEMPOTENCY - client_event_id for deduplication
  clientEventId?: string;
  sessionId?: string;
  productUrl: string;
  actionType: 'bookmark' | 'cart';
  seconds: number;
  timestamp: number;
};

// GOLD: Product interaction for sync
type ProductInteractionEvent = {
  // ✅ FIX #3: IDEMPOTENCY - client_event_id for deduplication
  clientEventId?: string;
  sessionId?: string;
  productUrl: string;
  interactionType: string;
  metadata?: Record<string, any>;
  bodyMeasurementsAtTime?: any;
  timestamp: number;
};

// Server-format bookmark for sync request (different property names than local)
type ServerBookmarkRequest = {
  id?: string;
  url: string;
  title: string;
  faviconUrl?: string;
  price?: number;
  priceHistory?: {price: number; date: number}[];
  brand?: string;
  category?: string;
  source?: string;
  sizesViewed?: string[];
  colorsViewed?: string[];
  viewCount?: number;
  lastViewedAt?: number;
  emotionAtSave?: string;
  createdAt?: number;
};

// Server-format history for sync request
type ServerHistoryRequest = {
  url: string;
  title: string;
  source?: string;
  dwellTimeSeconds?: number;
  scrollDepthPercent?: number;
  visitCount: number;
  visitedAt: number;
  brand?: string;
  sessionId?: string;
  isCartPage?: boolean;
};

// Server-format collection for sync request
type ServerCollectionRequest = {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkIds?: string[];
  createdAt?: number;
  updatedAt?: number;
};

// Server-format tab for sync request
type ServerTabRequest = {
  id: string;
  url: string;
  title?: string;
};

type SyncRequest = {
  bookmarks: ServerBookmarkRequest[];
  deletedBookmarkUrls: string[];
  history: ServerHistoryRequest[];
  collections: ServerCollectionRequest[];
  deletedCollectionIds: string[];
  cartHistory: LocalCartHistory[];
  tabs?: ServerTabRequest[];
  currentTabId?: string | null;
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
  // Tabs are ephemeral - don't restore from server

  return {
    bookmarks,
    history,
    collections,
    cartHistory,
    tabs: [], // Tabs are ephemeral, not synced
    currentTabId: null,
    serverTimestamp: response.serverTimestamp,
  };
}

// Helper to check if string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ✅ FIX #2: URL SANITIZATION - Strip query params and fragments to prevent PII leakage
function sanitizeUrlForAnalytics(url: string): string {
  try {
    const parsed = new URL(url);
    // Return only scheme, host, and path (no ? or #)
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    // Fallback for invalid URLs: regex-based stripping
    return url.match(/^(https?:\/\/[^/?#]+(?:\/[^?#]*)?)/)?.[1] || '';
  }
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
      console.log('[BrowserSync] Starting full sync...');

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
      console.log('[BrowserSync] Full sync response:', {
        bookmarks: serverData.bookmarks?.length || 0,
        history: serverData.history?.length || 0,
        collections: serverData.collections?.length || 0,
        cartHistory: serverData.cartHistory?.length || 0,
      });
      const data = mapServerResponseToLocal(serverData);

      // Apply server data to local store
      console.log('[BrowserSync] Applying server data to store...');
      store.applyServerSync(data);
      store.clearPendingChanges();
      store.setSyncState(false);

      // Verify the data was applied
      const storeAfter = useShoppingStore.getState();
      console.log('[BrowserSync] Store after sync:', {
        bookmarks: storeAfter.bookmarks?.length || 0,
        history: storeAfter.history?.length || 0,
        collections: storeAfter.collections?.length || 0,
        cartHistory: storeAfter.cartHistory?.length || 0,
      });

      console.log('[BrowserSync] Full sync complete');
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';
      console.error('[BrowserSync] Full sync error:', message);
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

    console.log('[BrowserSync] pushChanges called with:', {
      bookmarks: pendingChanges.bookmarks.length,
      deletedBookmarkUrls: pendingChanges.deletedBookmarkUrls.length,
      history: pendingChanges.history.length,
      collections: pendingChanges.collections.length,
      cartHistory: pendingCartHistory.length,
      tabs: store.tabs.length,
    });

    // Check if there are any changes to push
    // Note: We always push tabs if there are any, to keep them synced
    const hasChanges =
      pendingChanges.bookmarks.length > 0 ||
      pendingChanges.deletedBookmarkUrls.length > 0 ||
      pendingChanges.history.length > 0 ||
      pendingChanges.collections.length > 0 ||
      pendingChanges.deletedCollectionIds.length > 0 ||
      pendingCartHistory.length > 0 ||
      store.tabs.length > 0 ||
      timeToActionLog.length > 0 ||
      productInteractions.length > 0;

    if (!hasChanges) {
      console.log('[BrowserSync] No changes to push');
      return null;
    }

    try {
      store.setSyncState(true);

      // Map local data to server format
      // Backend DTO uses different property names than frontend store
      const requestBody: SyncRequest = {
        bookmarks: pendingChanges.bookmarks.map(b => ({
          // Map frontend properties to backend DTO property names
          // Only send properties that exist in BookmarkDto
          id: b.id && isValidUUID(b.id) ? b.id : undefined, // Only send if valid UUID
          // ✅ FIX #2: SANITIZE URL - strip query params and fragments
          url: sanitizeUrlForAnalytics(b.url),
          title: b.title,
          faviconUrl: b.imageUrl, // imageUrl -> faviconUrl
          price: b.price,
          priceHistory: b.priceHistory,
          brand: b.brand,
          category: b.category,
          source: b.source,
          sizesViewed: b.sizesViewed,
          colorsViewed: b.colorsViewed,
          viewCount: b.viewCount,
          lastViewedAt: b.lastViewed, // lastViewed -> lastViewedAt
          emotionAtSave: b.emotionAtSave,
          createdAt: b.addedAt, // addedAt -> createdAt
          // NOTE: screenshot is NOT in DTO, don't send it
        })),
        deletedBookmarkUrls: pendingChanges.deletedBookmarkUrls,
        history: pendingChanges.history.map(h => ({
          // Map frontend properties to backend DTO property names
          // ✅ FIX #2: SANITIZE URL - strip query params and fragments
          url: sanitizeUrlForAnalytics(h.url),
          title: h.title,
          source: h.source,
          dwellTimeSeconds: h.dwellTime, // dwellTime -> dwellTimeSeconds
          scrollDepthPercent: h.scrollDepth, // scrollDepth -> scrollDepthPercent
          visitCount: h.visitCount,
          visitedAt: h.visitedAt,
          brand: h.brand,
          sessionId: h.sessionId,
          isCartPage: h.isCartPage,
        })),
        collections: pendingChanges.collections.map(c => ({
          // Map frontend properties to backend DTO property names
          id: c.id && isValidUUID(c.id) ? c.id : undefined,
          name: c.name,
          description: c.description,
          color: c.color,
          bookmarkUrls: c.items?.map(item => item.url), // Use URLs - they're consistent between client/server
          bookmarkIds: c.items?.map(item => item.id), // Keep for backwards compatibility
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
        // Tabs are ephemeral - don't sync to database
        // GOLD: Time-to-action events
        timeToActionEvents: timeToActionLog.map(e => ({
          clientEventId: e.clientEventId,
          sessionId: store.currentSessionId || undefined,
          productUrl: e.productUrl,
          actionType: e.actionType as 'bookmark' | 'cart',
          seconds: e.seconds,
          timestamp: e.timestamp,
        })),
        // GOLD: Product interactions
        productInteractions: productInteractions.map(
          (p: ProductInteraction) => ({
            // ✅ FIX #3: IDEMPOTENCY - Include client_event_id for deduplication
            clientEventId: p.clientEventId,
            sessionId: p.sessionId,
            productUrl: p.productUrl,
            interactionType: p.type,
            metadata: {},
            bodyMeasurementsAtTime: p.bodyMeasurementsAtTime,
            timestamp: p.timestamp,
          }),
        ),
      };

      console.log('[BrowserSync] Pushing to server...');
      const response = await fetch(`${this.baseUrl}/browser-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BrowserSync] Push failed:', response.status, errorText);
        throw new Error(`Push sync failed: ${response.status}`);
      }

      console.log('[BrowserSync] Push successful');
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
      console.error('[BrowserSync] Push error:', message);
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

      console.log('[BrowserSync] Sync decision:', {
        lastSyncTimestamp: store.lastSyncTimestamp,
        localDataEmpty,
        willDoFullSync: !store.lastSyncTimestamp || localDataEmpty,
      });

      if (!store.lastSyncTimestamp || localDataEmpty) {
        await this.fullSync(accessToken);
      } else {
        await this.deltaSync(accessToken);
      }

      return true;
    } catch (error) {
      console.error('[BrowserSync] Sync failed:', error);
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

  /**
   * Delete all shopping analytics on the server (GDPR)
   * Clears: time-to-action, product interactions, cart history, browsing history, etc.
   */
  async deleteAllAnalytics(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/browser-sync/analytics`, {
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
