import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import {
  BookmarkDto,
  HistoryEntryDto,
  CollectionDto,
  CartHistoryDto,
  CartEventDto,
  BrowserTabDto,
  SyncRequestDto,
  SyncResponseDto,
  TimeToActionDto,
  ProductInteractionDto,
} from './dto/sync.dto';

// Default limits
const DEFAULT_MAX_BOOKMARKS = 200;
const DEFAULT_MAX_HISTORY_DAYS = 90;
const DEFAULT_MAX_COLLECTIONS = 10;
const MAX_HISTORY_ENTRIES_PER_SYNC = 500;

@Injectable()
export class BrowserSyncService {
  constructor(private readonly db: DatabaseService) {}

  // Get user limits (with defaults)
  private async getUserLimits(userId: string): Promise<{
    maxBookmarks: number;
    maxHistoryDays: number;
    maxCollections: number;
  }> {
    const result = await this.db.query(
      `SELECT max_bookmarks, max_history_days, max_collections
       FROM user_browser_limits WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return {
        maxBookmarks: DEFAULT_MAX_BOOKMARKS,
        maxHistoryDays: DEFAULT_MAX_HISTORY_DAYS,
        maxCollections: DEFAULT_MAX_COLLECTIONS,
      };
    }

    return {
      maxBookmarks: result.rows[0].max_bookmarks,
      maxHistoryDays: result.rows[0].max_history_days,
      maxCollections: result.rows[0].max_collections,
    };
  }

  // Get current counts for limit enforcement
  private async getCurrentCounts(
    userId: string,
  ): Promise<{ bookmarkCount: number; collectionCount: number }> {
    const [bookmarkResult, collectionResult] = await Promise.all([
      this.db.query(
        'SELECT COUNT(*) as count FROM browser_bookmarks WHERE user_id = $1',
        [userId],
      ),
      this.db.query(
        'SELECT COUNT(*) as count FROM browser_collections WHERE user_id = $1',
        [userId],
      ),
    ]);

    return {
      bookmarkCount: parseInt(bookmarkResult.rows[0].count, 10),
      collectionCount: parseInt(collectionResult.rows[0].count, 10),
    };
  }

  // Full sync - pull all data for user
  async getFullSync(userId: string): Promise<SyncResponseDto> {
    const limits = await this.getUserLimits(userId);
    const counts = await this.getCurrentCounts(userId);

    const [bookmarksResult, historyResult, collectionsResult, cartHistoryResult, tabsResult, tabStateResult] =
      await Promise.all([
        this.db.query(
          `SELECT id, url, title, favicon_url, price, price_history, brand, category,
                source, sizes_viewed, colors_viewed, view_count, last_viewed_at,
                emotion_at_save, body_measurements_at_time,
                created_at, updated_at
         FROM browser_bookmarks
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2`,
          [userId, limits.maxBookmarks],
        ),
        this.db.query(
          `SELECT id, url, title, source, dwell_time_seconds, scroll_depth_percent,
                visit_count, visited_at, brand, session_id, is_cart_page,
                body_measurements_at_time
         FROM browser_history
         WHERE user_id = $1 AND visited_at > now() - INTERVAL '${limits.maxHistoryDays} days'
         ORDER BY visited_at DESC
         LIMIT $2`,
          [userId, MAX_HISTORY_ENTRIES_PER_SYNC],
        ),
        this.db.query(
          `SELECT c.id, c.name, c.description, c.color, c.created_at, c.updated_at,
                COALESCE(array_agg(ci.bookmark_id) FILTER (WHERE ci.bookmark_id IS NOT NULL), '{}') as bookmark_ids
         FROM browser_collections c
         LEFT JOIN browser_collection_items ci ON c.id = ci.collection_id
         WHERE c.user_id = $1
         GROUP BY c.id
         ORDER BY c.updated_at DESC
         LIMIT $2`,
          [userId, limits.maxCollections],
        ),
        this.db.query(
          `SELECT id, cart_url, abandoned, time_to_checkout, created_at, updated_at
         FROM browser_cart_history
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
          [userId],
        ),
        this.db.query(
          `SELECT tab_id, url, title, position, created_at, updated_at
         FROM browser_tabs
         WHERE user_id = $1
         ORDER BY position ASC
         LIMIT 50`,
          [userId],
        ),
        this.db.query(
          `SELECT current_tab_id FROM browser_tab_state WHERE user_id = $1`,
          [userId],
        ),
      ]);

    // Fetch cart events for each cart history entry
    const cartHistory = await this.mapCartHistoryFromDb(cartHistoryResult.rows);

    return {
      bookmarks: bookmarksResult.rows.map(this.mapBookmarkFromDb),
      history: historyResult.rows.map(this.mapHistoryFromDb),
      collections: collectionsResult.rows.map(this.mapCollectionFromDb),
      cartHistory,
      tabs: tabsResult.rows.map(this.mapTabFromDb),
      currentTabId: tabStateResult.rows[0]?.current_tab_id || null,
      serverTimestamp: Date.now(),
      limits: {
        maxBookmarks: limits.maxBookmarks,
        maxHistoryDays: limits.maxHistoryDays,
        maxCollections: limits.maxCollections,
        currentBookmarkCount: counts.bookmarkCount,
        currentCollectionCount: counts.collectionCount,
      },
    };
  }

  // Delta sync - get changes since timestamp
  async getDeltaSync(
    userId: string,
    lastSyncTimestamp: number,
  ): Promise<SyncResponseDto> {
    const limits = await this.getUserLimits(userId);
    const counts = await this.getCurrentCounts(userId);
    const sinceDate = new Date(lastSyncTimestamp);

    const [bookmarksResult, historyResult, collectionsResult, cartHistoryResult, tabsResult, tabStateResult] =
      await Promise.all([
        this.db.query(
          `SELECT id, url, title, favicon_url, price, price_history, brand, category,
                source, sizes_viewed, colors_viewed, view_count, last_viewed_at,
                emotion_at_save, body_measurements_at_time,
                created_at, updated_at
         FROM browser_bookmarks
         WHERE user_id = $1 AND updated_at > $2
         ORDER BY updated_at DESC`,
          [userId, sinceDate],
        ),
        this.db.query(
          `SELECT id, url, title, source, dwell_time_seconds, scroll_depth_percent,
                visit_count, visited_at, brand, session_id, is_cart_page,
                body_measurements_at_time
         FROM browser_history
         WHERE user_id = $1 AND visited_at > $2
         ORDER BY visited_at DESC
         LIMIT $3`,
          [userId, sinceDate, MAX_HISTORY_ENTRIES_PER_SYNC],
        ),
        this.db.query(
          `SELECT c.id, c.name, c.description, c.color, c.created_at, c.updated_at,
                COALESCE(array_agg(ci.bookmark_id) FILTER (WHERE ci.bookmark_id IS NOT NULL), '{}') as bookmark_ids
         FROM browser_collections c
         LEFT JOIN browser_collection_items ci ON c.id = ci.collection_id
         WHERE c.user_id = $1 AND c.updated_at > $2
         GROUP BY c.id
         ORDER BY c.updated_at DESC`,
          [userId, sinceDate],
        ),
        this.db.query(
          `SELECT id, cart_url, abandoned, time_to_checkout, created_at, updated_at
         FROM browser_cart_history
         WHERE user_id = $1 AND updated_at > $2
         ORDER BY updated_at DESC`,
          [userId, sinceDate],
        ),
        // For tabs, always return all tabs (they're replaced as a set)
        this.db.query(
          `SELECT tab_id, url, title, position, created_at, updated_at
         FROM browser_tabs
         WHERE user_id = $1
         ORDER BY position ASC
         LIMIT 50`,
          [userId],
        ),
        this.db.query(
          `SELECT current_tab_id FROM browser_tab_state WHERE user_id = $1`,
          [userId],
        ),
      ]);

    // Fetch cart events for each cart history entry
    const cartHistory = await this.mapCartHistoryFromDb(cartHistoryResult.rows);

    return {
      bookmarks: bookmarksResult.rows.map(this.mapBookmarkFromDb),
      history: historyResult.rows.map(this.mapHistoryFromDb),
      collections: collectionsResult.rows.map(this.mapCollectionFromDb),
      cartHistory,
      tabs: tabsResult.rows.map(this.mapTabFromDb),
      currentTabId: tabStateResult.rows[0]?.current_tab_id || null,
      serverTimestamp: Date.now(),
      limits: {
        maxBookmarks: limits.maxBookmarks,
        maxHistoryDays: limits.maxHistoryDays,
        maxCollections: limits.maxCollections,
        currentBookmarkCount: counts.bookmarkCount,
        currentCollectionCount: counts.collectionCount,
      },
    };
  }

  // Push sync - receive changes from client
  async pushSync(userId: string, data: SyncRequestDto): Promise<SyncResponseDto> {
    const limits = await this.getUserLimits(userId);
    const counts = await this.getCurrentCounts(userId);

    // Process deletions first
    if (data.deletedBookmarkUrls?.length) {
      await this.deleteBookmarksByUrls(userId, data.deletedBookmarkUrls);
    }

    if (data.deletedCollectionIds?.length) {
      await this.deleteCollections(userId, data.deletedCollectionIds);
    }

    // Process upserts with limit checks
    if (data.bookmarks?.length) {
      const newBookmarksCount = data.bookmarks.filter((b) => !b.id).length;
      if (counts.bookmarkCount + newBookmarksCount > limits.maxBookmarks) {
        throw new BadRequestException(
          `Bookmark limit exceeded. Max: ${limits.maxBookmarks}, Current: ${counts.bookmarkCount}`,
        );
      }
      await this.upsertBookmarks(userId, data.bookmarks);
    }

    if (data.history?.length) {
      await this.upsertHistory(userId, data.history);
    }

    if (data.collections?.length) {
      const newCollectionsCount = data.collections.filter((c) => !c.id).length;
      if (counts.collectionCount + newCollectionsCount > limits.maxCollections) {
        throw new BadRequestException(
          `Collection limit exceeded. Max: ${limits.maxCollections}, Current: ${counts.collectionCount}`,
        );
      }
      await this.upsertCollections(userId, data.collections);
    }

    if (data.cartHistory?.length) {
      await this.upsertCartHistory(userId, data.cartHistory);
    }

    // Sync tabs - replace all tabs with client state
    if (data.tabs !== undefined) {
      await this.replaceTabs(userId, data.tabs || [], data.currentTabId || null);
    }

    // GOLD: Insert time-to-action events
    if (data.timeToActionEvents?.length) {
      await this.insertTimeToActionEvents(userId, data.timeToActionEvents);
    }

    // GOLD: Insert product interactions
    if (data.productInteractions?.length) {
      await this.insertProductInteractions(userId, data.productInteractions);
    }

    // Return updated state
    return this.getFullSync(userId);
  }

  // Upsert bookmarks
  private async upsertBookmarks(
    userId: string,
    bookmarks: BookmarkDto[],
  ): Promise<void> {
    for (const bookmark of bookmarks) {
      await this.db.query(
        `INSERT INTO browser_bookmarks
         (user_id, url, title, favicon_url, price, price_history, brand, category,
          source, sizes_viewed, colors_viewed, view_count, last_viewed_at,
          emotion_at_save, body_measurements_at_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (user_id, url)
         DO UPDATE SET
           title = COALESCE(EXCLUDED.title, browser_bookmarks.title),
           favicon_url = COALESCE(EXCLUDED.favicon_url, browser_bookmarks.favicon_url),
           price = COALESCE(EXCLUDED.price, browser_bookmarks.price),
           price_history = COALESCE(EXCLUDED.price_history, browser_bookmarks.price_history),
           brand = COALESCE(EXCLUDED.brand, browser_bookmarks.brand),
           category = COALESCE(EXCLUDED.category, browser_bookmarks.category),
           source = COALESCE(EXCLUDED.source, browser_bookmarks.source),
           sizes_viewed = COALESCE(EXCLUDED.sizes_viewed, browser_bookmarks.sizes_viewed),
           colors_viewed = COALESCE(EXCLUDED.colors_viewed, browser_bookmarks.colors_viewed),
           view_count = COALESCE(EXCLUDED.view_count, browser_bookmarks.view_count),
           last_viewed_at = COALESCE(EXCLUDED.last_viewed_at, browser_bookmarks.last_viewed_at),
           emotion_at_save = COALESCE(EXCLUDED.emotion_at_save, browser_bookmarks.emotion_at_save),
           body_measurements_at_time = COALESCE(EXCLUDED.body_measurements_at_time, browser_bookmarks.body_measurements_at_time),
           updated_at = now()`,
        [
          userId,
          bookmark.url,
          bookmark.title || null,
          bookmark.faviconUrl || null,
          bookmark.price || null,
          JSON.stringify(bookmark.priceHistory || []),
          bookmark.brand || null,
          bookmark.category || null,
          bookmark.source || null,
          bookmark.sizesViewed || [],
          bookmark.colorsViewed || [],
          bookmark.viewCount || 1,
          bookmark.lastViewedAt ? new Date(bookmark.lastViewedAt) : null,
          bookmark.emotionAtSave || null, // GOLD #5
          bookmark.bodyMeasurementsAtTime ? JSON.stringify(bookmark.bodyMeasurementsAtTime) : null, // GOLD #8
        ],
      );
    }
  }

  // Upsert history entries
  private async upsertHistory(
    userId: string,
    history: HistoryEntryDto[],
  ): Promise<void> {
    for (const entry of history) {
      await this.db.query(
        `INSERT INTO browser_history
         (user_id, url, title, source, dwell_time_seconds, scroll_depth_percent, visit_count, visited_at, brand,
          session_id, is_cart_page, body_measurements_at_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (user_id, url)
         DO UPDATE SET
           title = COALESCE(EXCLUDED.title, browser_history.title),
           source = COALESCE(EXCLUDED.source, browser_history.source),
           dwell_time_seconds = GREATEST(EXCLUDED.dwell_time_seconds, browser_history.dwell_time_seconds),
           scroll_depth_percent = GREATEST(EXCLUDED.scroll_depth_percent, browser_history.scroll_depth_percent),
           visit_count = GREATEST(EXCLUDED.visit_count, browser_history.visit_count),
           visited_at = GREATEST(EXCLUDED.visited_at, browser_history.visited_at),
           brand = COALESCE(EXCLUDED.brand, browser_history.brand),
           session_id = COALESCE(EXCLUDED.session_id, browser_history.session_id),
           is_cart_page = COALESCE(EXCLUDED.is_cart_page, browser_history.is_cart_page),
           body_measurements_at_time = COALESCE(EXCLUDED.body_measurements_at_time, browser_history.body_measurements_at_time)`,
        [
          userId,
          entry.url,
          entry.title || null,
          entry.source || null,
          entry.dwellTimeSeconds || 0,
          entry.scrollDepthPercent || 0,
          entry.visitCount || 1,
          entry.visitedAt ? new Date(entry.visitedAt) : new Date(),
          entry.brand || null,
          entry.sessionId || null, // GOLD #3
          entry.isCartPage || false, // GOLD #3b
          entry.bodyMeasurementsAtTime ? JSON.stringify(entry.bodyMeasurementsAtTime) : null, // GOLD #8
        ],
      );
    }
  }

  // Upsert collections
  private async upsertCollections(
    userId: string,
    collections: CollectionDto[],
  ): Promise<void> {
    for (const collection of collections) {
      const result = await this.db.query(
        `INSERT INTO browser_collections
         (user_id, name, description, color)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, name)
         DO UPDATE SET
           description = COALESCE(EXCLUDED.description, browser_collections.description),
           color = COALESCE(EXCLUDED.color, browser_collections.color),
           updated_at = now()
         RETURNING id`,
        [
          userId,
          collection.name,
          collection.description || null,
          collection.color || '#3b82f6',
        ],
      );

      const collectionId = result.rows[0].id;

      // Update collection items if provided
      // Prefer bookmarkUrls over bookmarkIds (URLs are consistent between client/server)
      if (collection.bookmarkUrls?.length) {
        // Clear existing items
        await this.db.query(
          'DELETE FROM browser_collection_items WHERE collection_id = $1',
          [collectionId],
        );

        // Insert new items by URL lookup
        for (const url of collection.bookmarkUrls) {
          await this.db.query(
            `INSERT INTO browser_collection_items (collection_id, bookmark_id)
             SELECT $1, id FROM browser_bookmarks WHERE url = $2 AND user_id = $3
             ON CONFLICT DO NOTHING`,
            [collectionId, url, userId],
          );
        }
      } else if (collection.bookmarkIds?.length) {
        // Fallback to bookmarkIds for backwards compatibility
        // Clear existing items
        await this.db.query(
          'DELETE FROM browser_collection_items WHERE collection_id = $1',
          [collectionId],
        );

        // Insert new items
        for (const bookmarkId of collection.bookmarkIds) {
          await this.db.query(
            `INSERT INTO browser_collection_items (collection_id, bookmark_id)
             SELECT $1, id FROM browser_bookmarks WHERE id = $2 AND user_id = $3
             ON CONFLICT DO NOTHING`,
            [collectionId, bookmarkId, userId],
          );
        }
      }
    }
  }

  // Delete bookmarks by URL (more reliable than ID for client sync)
  async deleteBookmarkByUrl(userId: string, url: string): Promise<void> {
    await this.db.query(
      'DELETE FROM browser_bookmarks WHERE user_id = $1 AND url = $2',
      [userId, url],
    );
  }

  // Delete multiple bookmarks by URLs
  private async deleteBookmarksByUrls(
    userId: string,
    urls: string[],
  ): Promise<void> {
    if (urls.length === 0) return;

    await this.db.query(
      'DELETE FROM browser_bookmarks WHERE user_id = $1 AND url = ANY($2::text[])',
      [userId, urls],
    );
  }

  // Delete collections by ID
  private async deleteCollections(
    userId: string,
    collectionIds: string[],
  ): Promise<void> {
    if (collectionIds.length === 0) return;

    await this.db.query(
      'DELETE FROM browser_collections WHERE user_id = $1 AND id = ANY($2::uuid[])',
      [userId, collectionIds],
    );
  }

  // Clear all browsing history for a user
  async clearHistory(userId: string): Promise<void> {
    await this.db.query('DELETE FROM browser_history WHERE user_id = $1', [
      userId,
    ]);
  }

  // Map database row to DTO
  private mapBookmarkFromDb(row: any): BookmarkDto {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      faviconUrl: row.favicon_url,
      price: row.price ? parseFloat(row.price) : undefined,
      priceHistory: row.price_history || [],
      brand: row.brand,
      category: row.category,
      source: row.source,
      sizesViewed: row.sizes_viewed || [],
      colorsViewed: row.colors_viewed || [],
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at
        ? new Date(row.last_viewed_at).getTime()
        : undefined,
      emotionAtSave: row.emotion_at_save, // GOLD #5
      bodyMeasurementsAtTime: row.body_measurements_at_time, // GOLD #8
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  }

  private mapHistoryFromDb(row: any): HistoryEntryDto {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      source: row.source,
      dwellTimeSeconds: row.dwell_time_seconds,
      scrollDepthPercent: row.scroll_depth_percent,
      visitCount: row.visit_count,
      visitedAt: new Date(row.visited_at).getTime(),
      brand: row.brand,
      sessionId: row.session_id, // GOLD #3
      isCartPage: row.is_cart_page, // GOLD #3b
      bodyMeasurementsAtTime: row.body_measurements_at_time, // GOLD #8
    };
  }

  private mapCollectionFromDb(row: any): CollectionDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      bookmarkIds: row.bookmark_ids || [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  }

  private mapTabFromDb(row: any): BrowserTabDto {
    return {
      id: row.tab_id,
      url: row.url,
      title: row.title,
      position: row.position,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
  }

  // Replace all tabs for a user (full sync approach for tabs)
  private async replaceTabs(
    userId: string,
    tabs: BrowserTabDto[],
    currentTabId: string | null,
  ): Promise<void> {
    // Delete all existing tabs for this user
    await this.db.query('DELETE FROM browser_tabs WHERE user_id = $1', [userId]);

    // Deduplicate tabs by tab_id (keep first occurrence)
    const seenTabIds = new Set<string>();
    const uniqueTabs = tabs.filter(tab => {
      if (!tab.id || seenTabIds.has(tab.id)) {
        return false;
      }
      seenTabIds.add(tab.id);
      return true;
    });

    // Insert new tabs with ON CONFLICT to handle any remaining edge cases
    for (let i = 0; i < uniqueTabs.length; i++) {
      const tab = uniqueTabs[i];
      await this.db.query(
        `INSERT INTO browser_tabs (user_id, tab_id, url, title, position)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, tab_id)
         DO UPDATE SET url = EXCLUDED.url, title = EXCLUDED.title, position = EXCLUDED.position, updated_at = now()`,
        [userId, tab.id, tab.url, tab.title || 'New Tab', i],
      );
    }

    // Update current tab state
    await this.db.query(
      `INSERT INTO browser_tab_state (user_id, current_tab_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET current_tab_id = EXCLUDED.current_tab_id, updated_at = now()`,
      [userId, currentTabId],
    );
  }

  // Upsert cart history with events
  private async upsertCartHistory(
    userId: string,
    cartHistoryItems: CartHistoryDto[],
  ): Promise<void> {
    for (const cart of cartHistoryItems) {
      // Upsert the cart history entry
      const result = await this.db.query(
        `INSERT INTO browser_cart_history
         (user_id, cart_url, abandoned, time_to_checkout)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, cart_url)
         DO UPDATE SET
           abandoned = EXCLUDED.abandoned,
           time_to_checkout = COALESCE(EXCLUDED.time_to_checkout, browser_cart_history.time_to_checkout),
           updated_at = now()
         RETURNING id`,
        [
          userId,
          cart.cartUrl,
          cart.abandoned,
          cart.timeToCheckout || null,
        ],
      );

      const cartHistoryId = result.rows[0].id;

      // Delete existing events and insert new ones (full replacement for simplicity)
      await this.db.query(
        'DELETE FROM browser_cart_events WHERE cart_history_id = $1',
        [cartHistoryId],
      );

      // Insert all events
      for (const event of cart.events) {
        await this.db.query(
          `INSERT INTO browser_cart_events
           (cart_history_id, event_type, timestamp, cart_url, item_count, cart_value, items)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            cartHistoryId,
            event.type,
            event.timestamp,
            event.cartUrl,
            event.itemCount || null,
            event.cartValue || null,
            JSON.stringify(event.items || []),
          ],
        );
      }
    }
  }

  // Map cart history from database (fetches events for each cart)
  private async mapCartHistoryFromDb(rows: any[]): Promise<CartHistoryDto[]> {
    if (rows.length === 0) return [];

    const cartIds = rows.map((r) => r.id);

    // Fetch all events for these carts in one query
    const eventsResult = await this.db.query(
      `SELECT cart_history_id, event_type, timestamp, cart_url, item_count, cart_value, items
       FROM browser_cart_events
       WHERE cart_history_id = ANY($1::uuid[])
       ORDER BY timestamp ASC`,
      [cartIds],
    );

    // Group events by cart_history_id
    const eventsByCartId: Record<string, CartEventDto[]> = {};
    for (const event of eventsResult.rows) {
      const cartId = event.cart_history_id;
      if (!eventsByCartId[cartId]) {
        eventsByCartId[cartId] = [];
      }
      eventsByCartId[cartId].push({
        type: event.event_type,
        timestamp: parseInt(event.timestamp, 10),
        cartUrl: event.cart_url,
        itemCount: event.item_count,
        cartValue: event.cart_value ? parseFloat(event.cart_value) : undefined,
        items: event.items || [],
      });
    }

    return rows.map((row) => ({
      id: row.id,
      cartUrl: row.cart_url,
      events: eventsByCartId[row.id] || [],
      abandoned: row.abandoned,
      timeToCheckout: row.time_to_checkout,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  }

  // GOLD: Insert time-to-action events
  private async insertTimeToActionEvents(
    userId: string,
    events: TimeToActionDto[],
  ): Promise<void> {
    for (const event of events) {
      await this.db.query(
        `INSERT INTO browser_time_to_action
         (user_id, session_id, product_url, action_type, time_to_action_seconds, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          event.sessionId || null,
          event.productUrl,
          event.actionType,
          event.seconds,
          new Date(event.timestamp),
        ],
      );
    }
  }

  // GOLD: Insert product interactions
  private async insertProductInteractions(
    userId: string,
    interactions: ProductInteractionDto[],
  ): Promise<void> {
    for (const interaction of interactions) {
      await this.db.query(
        `INSERT INTO browser_product_interactions
         (user_id, session_id, product_url, interaction_type, metadata, body_measurements_at_time, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          interaction.sessionId || null,
          interaction.productUrl,
          interaction.interactionType,
          JSON.stringify(interaction.metadata || {}),
          interaction.bodyMeasurementsAtTime
            ? JSON.stringify(interaction.bodyMeasurementsAtTime)
            : null,
          new Date(interaction.timestamp),
        ],
      );
    }
  }
}
