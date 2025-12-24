import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import {
  BookmarkDto,
  HistoryEntryDto,
  CollectionDto,
  SyncRequestDto,
  SyncResponseDto,
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

    const [bookmarksResult, historyResult, collectionsResult] =
      await Promise.all([
        this.db.query(
          `SELECT id, url, title, favicon_url, price, price_history, brand, category,
                source, sizes_viewed, colors_viewed, view_count, last_viewed_at,
                created_at, updated_at
         FROM browser_bookmarks
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2`,
          [userId, limits.maxBookmarks],
        ),
        this.db.query(
          `SELECT id, url, title, source, dwell_time_seconds, scroll_depth_percent,
                visit_count, visited_at
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
      ]);

    return {
      bookmarks: bookmarksResult.rows.map(this.mapBookmarkFromDb),
      history: historyResult.rows.map(this.mapHistoryFromDb),
      collections: collectionsResult.rows.map(this.mapCollectionFromDb),
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

    const [bookmarksResult, historyResult, collectionsResult] =
      await Promise.all([
        this.db.query(
          `SELECT id, url, title, favicon_url, price, price_history, brand, category,
                source, sizes_viewed, colors_viewed, view_count, last_viewed_at,
                created_at, updated_at
         FROM browser_bookmarks
         WHERE user_id = $1 AND updated_at > $2
         ORDER BY updated_at DESC`,
          [userId, sinceDate],
        ),
        this.db.query(
          `SELECT id, url, title, source, dwell_time_seconds, scroll_depth_percent,
                visit_count, visited_at
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
      ]);

    return {
      bookmarks: bookmarksResult.rows.map(this.mapBookmarkFromDb),
      history: historyResult.rows.map(this.mapHistoryFromDb),
      collections: collectionsResult.rows.map(this.mapCollectionFromDb),
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
          source, sizes_viewed, colors_viewed, view_count, last_viewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
         (user_id, url, title, source, dwell_time_seconds, scroll_depth_percent, visit_count, visited_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          entry.url,
          entry.title || null,
          entry.source || null,
          entry.dwellTimeSeconds || 0,
          entry.scrollDepthPercent || 0,
          entry.visitCount || 1,
          entry.visitedAt ? new Date(entry.visitedAt) : new Date(),
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
      if (collection.bookmarkIds?.length) {
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
}
