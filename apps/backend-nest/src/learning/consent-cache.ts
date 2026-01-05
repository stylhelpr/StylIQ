/**
 * Consent Cache
 *
 * In-memory cache for user learning consent to prevent per-event DB reads.
 * Uses short TTL (1 minute) to balance performance with correctness.
 */

import { Injectable } from '@nestjs/common';
import { CONSENT_CACHE_CONFIG } from '../config/feature-flags';
import { pool } from '../db/pool';

interface CacheEntry {
  hasConsent: boolean;
  expiresAt: number;
}

@Injectable()
export class ConsentCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Check if user has learning consent.
   * Returns cached value if available and not expired.
   * Otherwise fetches from DB and caches result.
   */
  async check(userId: string): Promise<boolean> {
    const cached = this.cache.get(userId);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.hasConsent;
    }

    // Cache miss or expired - fetch from DB
    const hasConsent = await this.fetchConsent(userId);

    this.cache.set(userId, {
      hasConsent,
      expiresAt: now + CONSENT_CACHE_CONFIG.TTL_MS,
    });

    return hasConsent;
  }

  /**
   * Invalidate cache for a user.
   * Call this when user revokes consent via API.
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear entire cache.
   * Useful for testing or emergency reset.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for real implementation
    };
  }

  /**
   * Fetch consent from database.
   * Returns false if user not found or column is null/false.
   */
  private async fetchConsent(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT learning_consent FROM users WHERE id = $1',
        [userId],
      );
      return result.rows[0]?.learning_consent === true;
    } catch (error) {
      // Log but don't throw - default to no consent on error
      console.warn(
        `[ConsentCache] Failed to fetch consent for ${userId}: ${error.message}`,
      );
      return false;
    }
  }
}
