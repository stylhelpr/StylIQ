import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../db/pool';

/**
 * Recommendation Service for "Recommended for You" carousel
 *
 * SCORING FORMULA (locked):
 * score =
 *   followAffinity   * 0.35 +
 *   hashtagMatch     * 0.25 +
 *   keywordMatch     * 0.20 +
 *   recency          * 0.15 +
 *   engagement       * 0.05
 *
 * SIGNAL DEFINITIONS:
 * - followAffinity: 1.0 if followed, 0.7 if frequently visited, 0 otherwise
 * - hashtagMatch: overlap ratio between post hashtags and user preferred hashtags
 * - keywordMatch: overlap ratio between post keywords and user preferred keywords
 * - recency: normalized decay (newer = higher)
 * - engagement: log-scaled views_count + likes_count
 *
 * CANDIDATE GENERATION:
 * 1. Posts from followed users
 * 2. Posts from frequently visited users
 * 3. Posts matching preferred hashtags
 * 4. Posts matching preferred keywords
 * 5. Newest posts (recency fallback)
 *
 * HARD CONSTRAINTS:
 * - Max 1 post per author
 * - Return 5-10 posts max
 * - Exclude own posts
 * - Exclude blocked/muted users
 */

interface UserSignals {
  followed_user_ids: string[];
  frequently_visited_user_ids: string[];
  preferred_hashtags: string[];
  preferred_keywords: string[];
}

interface ScoredPost {
  id: string;
  user_id: string;
  image_url: string | null;
  top_image: string | null;
  bottom_image: string | null;
  shoes_image: string | null;
  accessory_image: string | null;
  name: string | null;
  description: string | null;
  tags: string[];
  keywords: string[];
  likes_count: number;
  views_count: number;
  created_at: Date;
  user_name: string;
  user_avatar: string;
  score: number;
}

// Weights from the spec (locked)
const WEIGHTS = {
  followAffinity: 0.35,
  hashtagMatch: 0.25,
  keywordMatch: 0.2,
  recency: 0.15,
  engagement: 0.05,
};

// Pool size limits for candidate generation
const POOL_LIMIT = 50;
const MAX_RESULTS = 10;

@Injectable()
export class CommunityRecommendationsService implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.initTables();
      console.log('Recommendations tables ready');
    } catch (e: any) {
      console.error('Recommendations initTables failed:', e?.message || e);
    }
  }

  private async initTables() {
    // User signals table for storing preferences derived from behavior
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_signals (
        user_id UUID PRIMARY KEY,
        followed_user_ids UUID[] DEFAULT '{}',
        frequently_visited_user_ids UUID[] DEFAULT '{}',
        preferred_hashtags TEXT[] DEFAULT '{}',
        preferred_keywords TEXT[] DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Profile visits tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_id UUID NOT NULL,
        visited_id UUID NOT NULL,
        visited_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_visits_visitor ON profile_visits(visitor_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_visits_visited_at ON profile_visits(visited_at)
    `);

    // Add keywords column to community_posts if it doesn't exist
    await pool.query(`
      ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}'
    `);
  }

  /**
   * Track a profile visit for "frequently visited" signal
   */
  async trackProfileVisit(visitorId: string, visitedId: string): Promise<void> {
    if (visitorId === visitedId) return; // Don't track self-visits

    await pool.query(
      `INSERT INTO profile_visits (visitor_id, visited_id)
       VALUES ($1, $2)`,
      [visitorId, visitedId],
    );

    // Update frequently visited users (top 20 most visited in last 30 days)
    await this.updateFrequentlyVisitedUsers(visitorId);
  }

  /**
   * Update the frequently visited users for a given user
   */
  private async updateFrequentlyVisitedUsers(userId: string): Promise<void> {
    const result = await pool.query(
      `SELECT visited_id, COUNT(*) as visit_count
       FROM profile_visits
       WHERE visitor_id = $1
         AND visited_at > NOW() - INTERVAL '30 days'
       GROUP BY visited_id
       ORDER BY visit_count DESC
       LIMIT 20`,
      [userId],
    );

    const frequentlyVisitedIds = result.rows.map((r) => r.visited_id);

    await pool.query(
      `INSERT INTO user_signals (user_id, frequently_visited_user_ids, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         frequently_visited_user_ids = $2,
         updated_at = NOW()`,
      [userId, frequentlyVisitedIds],
    );
  }

  /**
   * Update hashtag preferences based on liked/saved posts
   */
  async updateHashtagPreferences(userId: string): Promise<void> {
    // Get hashtags from liked posts (last 90 days, weighted by recency)
    const likedTags = await pool.query(
      `SELECT UNNEST(cp.tags) as tag, COUNT(*) as cnt
       FROM post_likes pl
       JOIN community_posts cp ON cp.id = pl.post_id
       WHERE pl.user_id = $1
         AND pl.created_at > NOW() - INTERVAL '90 days'
       GROUP BY tag
       ORDER BY cnt DESC
       LIMIT 30`,
      [userId],
    );

    // Get hashtags from saved posts
    const savedTags = await pool.query(
      `SELECT UNNEST(cp.tags) as tag, COUNT(*) as cnt
       FROM saved_posts sp
       JOIN community_posts cp ON cp.id = sp.post_id
       WHERE sp.user_id = $1
         AND sp.created_at > NOW() - INTERVAL '90 days'
       GROUP BY tag
       ORDER BY cnt DESC
       LIMIT 30`,
      [userId],
    );

    // Merge and dedupe
    const tagCounts = new Map<string, number>();
    for (const row of likedTags.rows) {
      tagCounts.set(row.tag, (tagCounts.get(row.tag) || 0) + row.cnt * 2); // Likes weighted 2x
    }
    for (const row of savedTags.rows) {
      tagCounts.set(row.tag, (tagCounts.get(row.tag) || 0) + row.cnt * 3); // Saves weighted 3x
    }

    // Sort and take top 30
    const preferredHashtags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag]) => tag);

    await pool.query(
      `INSERT INTO user_signals (user_id, preferred_hashtags, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_hashtags = $2,
         updated_at = NOW()`,
      [userId, preferredHashtags],
    );
  }

  /**
   * Update keyword preferences based on liked/saved posts
   */
  async updateKeywordPreferences(userId: string): Promise<void> {
    // Get keywords from liked posts
    const likedKeywords = await pool.query(
      `SELECT UNNEST(cp.keywords) as keyword, COUNT(*) as cnt
       FROM post_likes pl
       JOIN community_posts cp ON cp.id = pl.post_id
       WHERE pl.user_id = $1
         AND pl.created_at > NOW() - INTERVAL '90 days'
       GROUP BY keyword
       ORDER BY cnt DESC
       LIMIT 30`,
      [userId],
    );

    // Get keywords from saved posts
    const savedKeywords = await pool.query(
      `SELECT UNNEST(cp.keywords) as keyword, COUNT(*) as cnt
       FROM saved_posts sp
       JOIN community_posts cp ON cp.id = sp.post_id
       WHERE sp.user_id = $1
         AND sp.created_at > NOW() - INTERVAL '90 days'
       GROUP BY keyword
       ORDER BY cnt DESC
       LIMIT 30`,
      [userId],
    );

    // Merge and dedupe
    const keywordCounts = new Map<string, number>();
    for (const row of likedKeywords.rows) {
      keywordCounts.set(
        row.keyword,
        (keywordCounts.get(row.keyword) || 0) + row.cnt * 2,
      );
    }
    for (const row of savedKeywords.rows) {
      keywordCounts.set(
        row.keyword,
        (keywordCounts.get(row.keyword) || 0) + row.cnt * 3,
      );
    }

    // Sort and take top 30
    const preferredKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([keyword]) => keyword);

    await pool.query(
      `INSERT INTO user_signals (user_id, preferred_keywords, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_keywords = $2,
         updated_at = NOW()`,
      [userId, preferredKeywords],
    );
  }

  /**
   * Sync followed users from user_follows table to user_signals
   */
  private async syncFollowedUsers(userId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT following_id FROM user_follows WHERE follower_id = $1`,
      [userId],
    );
    const followedIds = result.rows.map((r) => r.following_id);

    await pool.query(
      `INSERT INTO user_signals (user_id, followed_user_ids, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         followed_user_ids = $2,
         updated_at = NOW()`,
      [userId, followedIds],
    );

    return followedIds;
  }

  /**
   * Get user signals for recommendation scoring.
   * Automatically refreshes stale preferences (older than 1 hour).
   */
  private async getUserSignals(userId: string): Promise<UserSignals> {
    // Sync followed users first
    const followedIds = await this.syncFollowedUsers(userId);

    const result = await pool.query(
      `SELECT
         frequently_visited_user_ids,
         preferred_hashtags,
         preferred_keywords,
         updated_at
       FROM user_signals
       WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      // No signals yet - compute fresh ones asynchronously
      this.refreshSignalsAsync(userId);
      return {
        followed_user_ids: followedIds,
        frequently_visited_user_ids: [],
        preferred_hashtags: [],
        preferred_keywords: [],
      };
    }

    const row = result.rows[0];

    // Check if signals are stale (older than 1 hour)
    const updatedAt = new Date(row.updated_at).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (updatedAt < oneHourAgo) {
      // Refresh stale signals asynchronously (non-blocking)
      this.refreshSignalsAsync(userId);
    }

    return {
      followed_user_ids: followedIds,
      frequently_visited_user_ids: row.frequently_visited_user_ids || [],
      preferred_hashtags: row.preferred_hashtags || [],
      preferred_keywords: row.preferred_keywords || [],
    };
  }

  /**
   * Refresh hashtag and keyword preferences asynchronously.
   */
  private refreshSignalsAsync(userId: string): void {
    Promise.all([
      this.updateHashtagPreferences(userId),
      this.updateKeywordPreferences(userId),
    ]).catch((err) => {
      console.error(`Failed to refresh signals for user ${userId}:`, err);
    });
  }

  /**
   * Get blocked and muted user IDs for exclusion
   */
  private async getExcludedUserIds(userId: string): Promise<string[]> {
    const blocked = await pool.query(
      `SELECT blocked_id FROM blocked_users WHERE blocker_id = $1`,
      [userId],
    );
    const muted = await pool.query(
      `SELECT muted_id FROM muted_users WHERE muter_id = $1`,
      [userId],
    );

    const excludedIds = new Set<string>();
    excludedIds.add(userId); // Exclude own posts
    for (const row of blocked.rows) excludedIds.add(row.blocked_id);
    for (const row of muted.rows) excludedIds.add(row.muted_id);

    return Array.from(excludedIds);
  }

  /**
   * Get globally popular hashtags for cold start
   */
  private async getGlobalPopularHashtags(): Promise<string[]> {
    const result = await pool.query(
      `SELECT UNNEST(tags) as tag, COUNT(*) as cnt
       FROM community_posts
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY tag
       ORDER BY cnt DESC
       LIMIT 20`,
    );
    return result.rows.map((r) => r.tag);
  }

  /**
   * Generate candidate posts from multiple pools
   */
  private async generateCandidates(
    userId: string,
    signals: UserSignals,
    excludedUserIds: string[],
  ): Promise<Map<string, any>> {
    const candidates = new Map<string, any>();

    // Base query for fetching posts with user info
    const baseSelect = `
      SELECT
        cp.id,
        cp.user_id,
        cp.image_url,
        cp.top_image,
        cp.bottom_image,
        cp.shoes_image,
        cp.accessory_image,
        cp.name,
        cp.description,
        cp.tags,
        COALESCE(cp.keywords, '{}') as keywords,
        cp.likes_count,
        cp.views_count,
        cp.created_at,
        COALESCE(u.first_name, 'StylHelpr') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar
      FROM community_posts cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE cp.user_id != ALL($1::uuid[])
    `;

    // Pool 1: Posts from followed users
    if (signals.followed_user_ids.length > 0) {
      const followedPosts = await pool.query(
        `${baseSelect}
         AND cp.user_id = ANY($2::uuid[])
         ORDER BY cp.created_at DESC
         LIMIT $3`,
        [excludedUserIds, signals.followed_user_ids, POOL_LIMIT],
      );
      for (const row of followedPosts.rows) {
        candidates.set(row.id, row);
      }
    }

    // Pool 2: Posts from frequently visited users
    if (signals.frequently_visited_user_ids.length > 0) {
      const visitedPosts = await pool.query(
        `${baseSelect}
         AND cp.user_id = ANY($2::uuid[])
         ORDER BY cp.created_at DESC
         LIMIT $3`,
        [excludedUserIds, signals.frequently_visited_user_ids, POOL_LIMIT],
      );
      for (const row of visitedPosts.rows) {
        if (!candidates.has(row.id)) {
          candidates.set(row.id, row);
        }
      }
    }

    // Pool 3: Posts matching preferred hashtags
    if (signals.preferred_hashtags.length > 0) {
      const hashtagPosts = await pool.query(
        `${baseSelect}
         AND cp.tags && $2::text[]
         ORDER BY cp.created_at DESC
         LIMIT $3`,
        [excludedUserIds, signals.preferred_hashtags, POOL_LIMIT],
      );
      for (const row of hashtagPosts.rows) {
        if (!candidates.has(row.id)) {
          candidates.set(row.id, row);
        }
      }
    }

    // Pool 4: Posts matching preferred keywords
    if (signals.preferred_keywords.length > 0) {
      const keywordPosts = await pool.query(
        `${baseSelect}
         AND cp.keywords && $2::text[]
         ORDER BY cp.created_at DESC
         LIMIT $3`,
        [excludedUserIds, signals.preferred_keywords, POOL_LIMIT],
      );
      for (const row of keywordPosts.rows) {
        if (!candidates.has(row.id)) {
          candidates.set(row.id, row);
        }
      }
    }

    // Pool 5: Newest posts (recency fallback)
    const recentPosts = await pool.query(
      `${baseSelect}
       ORDER BY cp.created_at DESC
       LIMIT $2`,
      [excludedUserIds, POOL_LIMIT],
    );
    for (const row of recentPosts.rows) {
      if (!candidates.has(row.id)) {
        candidates.set(row.id, row);
      }
    }

    return candidates;
  }

  /**
   * Calculate overlap ratio between two arrays
   */
  private overlapRatio(postItems: string[], userPrefs: string[]): number {
    if (userPrefs.length === 0 || postItems.length === 0) return 0;

    const postSet = new Set(postItems.map((s) => s.toLowerCase()));
    const userSet = new Set(userPrefs.map((s) => s.toLowerCase()));

    let matches = 0;
    for (const item of postSet) {
      if (userSet.has(item)) matches++;
    }

    return matches / Math.max(postSet.size, 1);
  }

  /**
   * Calculate recency score (0-1, newer = higher)
   * Uses exponential decay with half-life of 7 days
   */
  private recencyScore(createdAt: Date): number {
    const now = Date.now();
    const postTime = new Date(createdAt).getTime();
    const ageMs = now - postTime;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const halfLifeDays = 7;

    // Exponential decay
    return Math.pow(0.5, ageDays / halfLifeDays);
  }

  /**
   * Calculate engagement score (log-scaled)
   */
  private engagementScore(likesCount: number, viewsCount: number): number {
    const total = (likesCount || 0) + (viewsCount || 0) * 0.1;
    if (total <= 0) return 0;
    // Log scale, normalized to 0-1 range (assuming max ~10000 engagement)
    return Math.min(Math.log10(total + 1) / 4, 1);
  }

  /**
   * Score a single post using the locked formula
   */
  private scorePost(post: any, signals: UserSignals): number {
    // Follow affinity: 1.0 if followed, 0.7 if frequently visited, 0 otherwise
    let followAffinity = 0;
    if (signals.followed_user_ids.includes(post.user_id)) {
      followAffinity = 1.0;
    } else if (signals.frequently_visited_user_ids.includes(post.user_id)) {
      followAffinity = 0.7;
    }

    // Hashtag match
    const hashtagMatch = this.overlapRatio(
      post.tags || [],
      signals.preferred_hashtags,
    );

    // Keyword match
    const keywordMatch = this.overlapRatio(
      post.keywords || [],
      signals.preferred_keywords,
    );

    // Recency
    const recency = this.recencyScore(post.created_at);

    // Engagement
    const engagement = this.engagementScore(post.likes_count, post.views_count);

    // Final score using locked weights
    const score =
      followAffinity * WEIGHTS.followAffinity +
      hashtagMatch * WEIGHTS.hashtagMatch +
      keywordMatch * WEIGHTS.keywordMatch +
      recency * WEIGHTS.recency +
      engagement * WEIGHTS.engagement;

    return score;
  }

  /**
   * Get recommended posts for a user
   * Returns 5-10 posts max, 1 per author
   */
  async getRecommendedPosts(userId: string): Promise<ScoredPost[]> {
    // Get user signals
    let signals = await this.getUserSignals(userId);

    // Cold start: if no signals, use global popular hashtags
    const isColdStart =
      signals.followed_user_ids.length === 0 &&
      signals.frequently_visited_user_ids.length === 0 &&
      signals.preferred_hashtags.length === 0 &&
      signals.preferred_keywords.length === 0;

    if (isColdStart) {
      const globalHashtags = await this.getGlobalPopularHashtags();
      signals = {
        ...signals,
        preferred_hashtags: globalHashtags,
      };
    }

    // Get excluded user IDs
    const excludedUserIds = await this.getExcludedUserIds(userId);

    // Generate candidates from multiple pools
    const candidates = await this.generateCandidates(
      userId,
      signals,
      excludedUserIds,
    );

    // Score all candidates
    const scoredPosts: ScoredPost[] = [];
    for (const [, post] of candidates) {
      const score = this.scorePost(post, signals);
      scoredPosts.push({
        ...post,
        score,
      });
    }

    // Sort by score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply hard constraints: max 1 post per author
    const seenAuthors = new Set<string>();
    const finalPosts: ScoredPost[] = [];

    for (const post of scoredPosts) {
      if (seenAuthors.has(post.user_id)) continue;
      seenAuthors.add(post.user_id);
      finalPosts.push(post);
      if (finalPosts.length >= MAX_RESULTS) break;
    }

    return finalPosts;
  }

  /**
   * Format posts for API response (matches CommunityPost shape)
   */
  formatPostsForResponse(posts: ScoredPost[], currentUserId?: string) {
    return posts.map((post) => ({
      id: post.id,
      user_id: post.user_id,
      user_name: post.user_name,
      user_avatar: post.user_avatar,
      image_url: post.image_url,
      top_image: post.top_image,
      bottom_image: post.bottom_image,
      shoes_image: post.shoes_image,
      accessory_image: post.accessory_image,
      name: post.name,
      description: post.description,
      tags: post.tags,
      likes_count: post.likes_count,
      comments_count: 0, // Not needed for carousel
      views_count: post.views_count,
      is_liked_by_me: false, // Would need additional query
      is_saved_by_me: false, // Would need additional query
      is_following_author: false, // Would need additional query
      is_demo: false,
      created_at: post.created_at,
    }));
  }
}
