import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class CommunityService {
  constructor() {
    this.initTables();
  }

  // One-time migration to fix tables with TEXT user_id columns to UUID
  private async migrateToUuidUserIds() {
    // Check if migration is needed by checking column type of post_likes.user_id
    const columnCheck = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'post_likes' AND column_name = 'user_id'
    `);

    // If table doesn't exist or already UUID, skip migration
    if (columnCheck.rows.length === 0 || columnCheck.rows[0].data_type === 'uuid') {
      return;
    }

    console.log('🔄 Migrating community tables from TEXT to UUID user_id columns...');

    // Drop all community tables to recreate with correct types
    await pool.query('DROP TABLE IF EXISTS post_reports CASCADE');
    await pool.query('DROP TABLE IF EXISTS muted_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS blocked_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS saved_posts CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_follows CASCADE');
    await pool.query('DROP TABLE IF EXISTS comment_likes CASCADE');
    await pool.query('DROP TABLE IF EXISTS post_comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS post_likes CASCADE');
    await pool.query('DROP TABLE IF EXISTS community_posts CASCADE');

    console.log('✅ Community tables dropped, will be recreated with UUID columns');
  }

  private async initTables() {
    // Drop and recreate tables to fix UUID column types (one-time migration)
    // The tables were originally created with TEXT user_id but need UUID
    await this.migrateToUuidUserIds();

    // Community posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        image_url TEXT,
        top_image TEXT,
        bottom_image TEXT,
        shoes_image TEXT,
        accessory_image TEXT,
        description TEXT,
        tags TEXT[] DEFAULT '{}',
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        is_demo BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Post likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        user_id UUID NOT NULL,
        post_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      )
    `);

    // Post comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        reply_to_id UUID,
        reply_to_user TEXT,
        likes_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Comment likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        user_id UUID NOT NULL,
        comment_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, comment_id)
      )
    `);

    // User follows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        follower_id UUID NOT NULL,
        following_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      )
    `);

    // Saved posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_posts (
        user_id UUID NOT NULL,
        post_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      )
    `);

    // Blocked users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_id UUID NOT NULL,
        blocked_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (blocker_id, blocked_id)
      )
    `);

    // Muted users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS muted_users (
        muter_id UUID NOT NULL,
        muted_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (muter_id, muted_id)
      )
    `);

    // Post reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL,
        post_id UUID NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed demo posts if table is empty
    await this.seedDemoPosts();
  }

  private async seedDemoPosts() {
    const countRes = await pool.query('SELECT COUNT(*) FROM community_posts');
    if (parseInt(countRes.rows[0].count) > 0) return;

    const demoPosts = [
      {
        image_url: 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400',
        tags: ['casual', 'summer'],
        description: 'Summer vibes',
      },
      {
        image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        tags: ['elegant', 'evening'],
        description: 'Evening elegance',
      },
      {
        image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
        tags: ['streetwear', 'urban'],
        description: 'Street style',
      },
      {
        image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
        tags: ['minimal', 'clean'],
        description: 'Minimal look',
      },
      {
        image_url: 'https://images.unsplash.com/photo-1485968579169-51d62cf4b8e6?w=400',
        tags: ['professional', 'smart'],
        description: 'Office ready',
      },
      {
        image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
        tags: ['boho', 'relaxed'],
        description: 'Boho vibes',
      },
      {
        top_image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400',
        bottom_image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
        shoes_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        accessory_image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        tags: ['casual', 'summer'],
        description: 'Complete summer outfit',
      },
      {
        top_image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        bottom_image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
        shoes_image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
        accessory_image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
        tags: ['elegant', 'evening'],
        description: 'Evening outfit combo',
      },
    ];

    for (const post of demoPosts) {
      await pool.query(
        `INSERT INTO community_posts (user_id, image_url, top_image, bottom_image, shoes_image, accessory_image, tags, description, likes_count, is_demo)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [
          post.image_url || null,
          post.top_image || null,
          post.bottom_image || null,
          post.shoes_image || null,
          post.accessory_image || null,
          post.tags,
          post.description,
          Math.floor(Math.random() * 500) + 100,
        ],
      );
    }
  }

  // ==================== POSTS ====================

  async createPost(
    userId: string,
    data: {
      imageUrl?: string;
      topImage?: string;
      bottomImage?: string;
      shoesImage?: string;
      accessoryImage?: string;
      description?: string;
      tags?: string[];
    },
  ) {
    const res = await pool.query(
      `INSERT INTO community_posts (user_id, image_url, top_image, bottom_image, shoes_image, accessory_image, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.imageUrl || null,
        data.topImage || null,
        data.bottomImage || null,
        data.shoesImage || null,
        data.accessoryImage || null,
        data.description || null,
        data.tags || [],
      ],
    );
    return res.rows[0];
  }

  async getPosts(
    filter: string = 'all',
    currentUserId?: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    console.log('📥 getPosts called:', { filter, currentUserId, limit, offset });
    let orderBy = 'ORDER BY cp.created_at DESC';
    let whereClause = 'WHERE 1=1';

    if (filter === 'trending') {
      orderBy = 'ORDER BY cp.likes_count DESC, cp.created_at DESC';
    } else if (filter === 'new') {
      orderBy = 'ORDER BY cp.created_at DESC';
    } else if (filter === 'following' && currentUserId) {
      whereClause = `WHERE cp.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $3)`;
      // Debug: check what follows exist for this user
      const followsCheck = await pool.query(
        'SELECT * FROM user_follows WHERE follower_id = $1',
        [currentUserId]
      );
      console.log('📊 User follows:', followsCheck.rows);
    }

    // Exclude posts from blocked/muted users for current user
    if (currentUserId) {
      whereClause += ` AND cp.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $3)`;
      whereClause += ` AND cp.user_id NOT IN (SELECT muted_id FROM muted_users WHERE muter_id = $3)`;
    }

    const query = `
      SELECT
        cp.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar,
        ${currentUserId ? `EXISTS(SELECT 1 FROM post_likes WHERE post_id = cp.id AND user_id = $3) as is_liked_by_me` : 'false as is_liked_by_me'},
        ${currentUserId ? `EXISTS(SELECT 1 FROM saved_posts WHERE post_id = cp.id AND user_id = $3) as is_saved_by_me` : 'false as is_saved_by_me'},
        ${currentUserId ? `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $3 AND following_id = cp.user_id) as is_following_author` : 'false as is_following_author'}
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $1 OFFSET $2
    `;

    const params = currentUserId ? [limit, offset, currentUserId] : [limit, offset];
    const res = await pool.query(query, params);
    return res.rows;
  }

  async searchPosts(query: string, currentUserId?: string, limit: number = 20) {
    const searchPattern = `%${query.toLowerCase()}%`;

    const sqlQuery = currentUserId
      ? `SELECT
          cp.*,
          COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
          COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar,
          EXISTS(SELECT 1 FROM post_likes WHERE post_id = cp.id AND user_id = $3) as is_liked_by_me,
          EXISTS(SELECT 1 FROM saved_posts WHERE post_id = cp.id AND user_id = $3) as is_saved_by_me,
          EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $3 AND following_id = cp.user_id) as is_following_author
        FROM community_posts cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE
          LOWER(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) LIKE $1
          OR $2 = ANY(SELECT LOWER(unnest(cp.tags)))
        ORDER BY cp.created_at DESC
        LIMIT $4`
      : `SELECT
          cp.*,
          COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
          COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar,
          false as is_liked_by_me,
          false as is_saved_by_me,
          false as is_following_author
        FROM community_posts cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE
          LOWER(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) LIKE $1
          OR $2 = ANY(SELECT LOWER(unnest(cp.tags)))
        ORDER BY cp.created_at DESC
        LIMIT $3`;

    const params = currentUserId
      ? [searchPattern, query.toLowerCase(), currentUserId, limit]
      : [searchPattern, query.toLowerCase(), limit];

    const res = await pool.query(sqlQuery, params);
    return res.rows;
  }

  async getPostById(postId: string, currentUserId?: string) {
    const res = await pool.query(
      `SELECT
        cp.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar,
        ${currentUserId ? `EXISTS(SELECT 1 FROM post_likes WHERE post_id = cp.id AND user_id = $2) as is_liked_by_me` : 'false as is_liked_by_me'},
        ${currentUserId ? `EXISTS(SELECT 1 FROM saved_posts WHERE post_id = cp.id AND user_id = $2) as is_saved_by_me` : 'false as is_saved_by_me'}
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE cp.id = $1`,
      currentUserId ? [postId, currentUserId] : [postId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Post not found');
    }
    return res.rows[0];
  }

  async deletePost(postId: string, userId: string) {
    const post = await pool.query('SELECT user_id FROM community_posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      throw new NotFoundException('Post not found');
    }
    if (post.rows[0].user_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await pool.query('DELETE FROM post_likes WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM post_comments WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM saved_posts WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM community_posts WHERE id = $1', [postId]);

    return { message: 'Post deleted' };
  }

  async updatePost(postId: string, userId: string, description?: string, tags?: string[]) {
    const post = await pool.query('SELECT user_id FROM community_posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      throw new NotFoundException('Post not found');
    }
    if (post.rows[0].user_id !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updates: string[] = [];
    const params: any[] = [postId];
    let paramIndex = 2;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { message: 'Nothing to update' };
    }

    await pool.query(
      `UPDATE community_posts SET ${updates.join(', ')} WHERE id = $1`,
      params,
    );

    return { message: 'Post updated' };
  }

  // ==================== LIKES ====================

  async likePost(postId: string, userId: string) {
    await pool.query(
      `INSERT INTO post_likes (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING`,
      [userId, postId],
    );

    await pool.query(
      `UPDATE community_posts
       SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1)
       WHERE id = $1`,
      [postId],
    );

    return { message: 'Post liked' };
  }

  async unlikePost(postId: string, userId: string) {
    await pool.query(
      'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId],
    );

    await pool.query(
      `UPDATE community_posts
       SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1)
       WHERE id = $1`,
      [postId],
    );

    return { message: 'Post unliked' };
  }

  // ==================== COMMENTS ====================

  async getComments(postId: string, currentUserId?: string) {
    const res = await pool.query(
      `SELECT
        pc.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || pc.user_id) as user_avatar,
        ${currentUserId ? `EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = pc.id AND user_id = $2) as is_liked_by_me` : 'false as is_liked_by_me'}
      FROM post_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = $1
      ORDER BY pc.created_at ASC`,
      currentUserId ? [postId, currentUserId] : [postId],
    );
    return res.rows;
  }

  async addComment(
    postId: string,
    userId: string,
    content: string,
    replyToId?: string,
    replyToUser?: string,
  ) {
    console.log('📥 addComment called:', { postId, userId, content, replyToId, replyToUser });
    const res = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, content, reply_to_id, reply_to_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [postId, userId, content, replyToId || null, replyToUser || null],
    );

    await pool.query(
      `UPDATE community_posts
       SET comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = $1)
       WHERE id = $1`,
      [postId],
    );

    // Get user info for response
    const userRes = await pool.query(
      `SELECT
        COALESCE(first_name, 'StylIQ') || ' ' || COALESCE(last_name, 'User') as user_name,
        COALESCE(profile_picture, 'https://i.pravatar.cc/100?u=' || $1) as user_avatar
      FROM users WHERE id = $1::uuid`,
      [userId],
    );

    return {
      ...res.rows[0],
      user_name: userRes.rows[0]?.user_name || 'You',
      user_avatar: userRes.rows[0]?.user_avatar || `https://i.pravatar.cc/100?u=${userId}`,
      is_liked_by_me: false,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await pool.query(
      'SELECT user_id, post_id FROM post_comments WHERE id = $1',
      [commentId],
    );
    if (comment.rows.length === 0) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.rows[0].user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const postId = comment.rows[0].post_id;

    await pool.query('DELETE FROM comment_likes WHERE comment_id = $1', [commentId]);
    await pool.query('DELETE FROM post_comments WHERE id = $1', [commentId]);

    await pool.query(
      `UPDATE community_posts
       SET comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = $1)
       WHERE id = $1`,
      [postId],
    );

    return { message: 'Comment deleted' };
  }

  async likeComment(commentId: string, userId: string) {
    await pool.query(
      `INSERT INTO comment_likes (user_id, comment_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, comment_id) DO NOTHING`,
      [userId, commentId],
    );

    await pool.query(
      `UPDATE post_comments
       SET likes_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1)
       WHERE id = $1`,
      [commentId],
    );

    return { message: 'Comment liked' };
  }

  async unlikeComment(commentId: string, userId: string) {
    await pool.query(
      'DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId],
    );

    await pool.query(
      `UPDATE post_comments
       SET likes_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1)
       WHERE id = $1`,
      [commentId],
    );

    return { message: 'Comment unliked' };
  }

  // ==================== FOLLOWS ====================

  async followUser(followerId: string, followingId: string) {
    console.log('📥 followUser called:', { followerId, followingId });
    if (!followerId || !followingId) {
      throw new ForbiddenException('User IDs are required');
    }
    if (followerId === followingId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    await pool.query(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId],
    );
    console.log('✅ Follow saved to database');

    return { message: 'User followed' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    );

    return { message: 'User unfollowed' };
  }

  async isFollowing(followerId: string, followingId: string) {
    const res = await pool.query(
      'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    );
    return res.rows.length > 0;
  }

  // ==================== SAVES ====================

  async savePost(userId: string, postId: string) {
    await pool.query(
      `INSERT INTO saved_posts (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING`,
      [userId, postId],
    );

    return { message: 'Post saved' };
  }

  async unsavePost(userId: string, postId: string) {
    await pool.query(
      'DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2',
      [userId, postId],
    );

    return { message: 'Post unsaved' };
  }

  async getSavedPosts(userId: string, limit: number = 20, offset: number = 0) {
    const res = await pool.query(
      `SELECT
        cp.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = cp.id AND user_id = $1) as is_liked_by_me,
        true as is_saved_by_me
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      INNER JOIN saved_posts sp ON cp.id = sp.post_id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return res.rows;
  }

  async getPostsByUser(authorId: string, limit: number = 20, offset: number = 0) {
    const res = await pool.query(
      `SELECT
        cp.*,
        COALESCE(u.first_name, 'StylIQ') || ' ' || COALESCE(u.last_name, 'User') as user_name,
        COALESCE(u.profile_picture, 'https://i.pravatar.cc/100?u=' || cp.user_id) as user_avatar
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE cp.user_id = $1
      ORDER BY cp.created_at DESC
      LIMIT $2 OFFSET $3`,
      [authorId, limit, offset],
    );
    return res.rows;
  }

  // ==================== BLOCK/MUTE ====================

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ForbiddenException('You cannot block yourself');
    }

    await pool.query(
      `INSERT INTO blocked_users (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, blockedId],
    );

    // Also unfollow them
    await pool.query(
      'DELETE FROM user_follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)',
      [blockerId, blockedId],
    );

    return { message: 'User blocked' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await pool.query(
      'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId],
    );

    return { message: 'User unblocked' };
  }

  async muteUser(muterId: string, mutedId: string) {
    if (muterId === mutedId) {
      throw new ForbiddenException('You cannot mute yourself');
    }

    await pool.query(
      `INSERT INTO muted_users (muter_id, muted_id)
       VALUES ($1, $2)
       ON CONFLICT (muter_id, muted_id) DO NOTHING`,
      [muterId, mutedId],
    );

    return { message: 'User muted' };
  }

  async unmuteUser(muterId: string, mutedId: string) {
    await pool.query(
      'DELETE FROM muted_users WHERE muter_id = $1 AND muted_id = $2',
      [muterId, mutedId],
    );

    return { message: 'User unmuted' };
  }

  // ==================== REPORTS ====================

  async reportPost(reporterId: string, postId: string, reason: string) {
    await pool.query(
      `INSERT INTO post_reports (reporter_id, post_id, reason)
       VALUES ($1, $2, $3)`,
      [reporterId, postId, reason],
    );

    return { message: 'Post reported' };
  }

  // ==================== USER PROFILE HELPERS ====================

  async getUserProfile(userId: string, currentUserId?: string) {
    const userRes = await pool.query(
      `SELECT
        id,
        COALESCE(first_name, 'StylIQ') || ' ' || COALESCE(last_name, 'User') as user_name,
        COALESCE(profile_picture, 'https://i.pravatar.cc/100?u=' || id) as user_avatar,
        (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count,
        (SELECT COUNT(*) FROM community_posts WHERE user_id = $1) as posts_count
      FROM users WHERE id = $1`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userRes.rows[0];

    if (currentUserId) {
      const isFollowing = await this.isFollowing(currentUserId, userId);
      const isBlocked = await pool.query(
        'SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [currentUserId, userId],
      );
      const isMuted = await pool.query(
        'SELECT 1 FROM muted_users WHERE muter_id = $1 AND muted_id = $2',
        [currentUserId, userId],
      );

      return {
        ...user,
        is_following: isFollowing,
        is_blocked: isBlocked.rows.length > 0,
        is_muted: isMuted.rows.length > 0,
      };
    }

    return user;
  }
}
