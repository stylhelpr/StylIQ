-- Community feature tables for social sharing
-- Run this migration to create all community-related tables

-- Community posts (shared outfits)
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
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  reply_to_id UUID,
  reply_to_user TEXT,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
  user_id UUID NOT NULL,
  comment_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- User follows
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Saved posts (bookmarks)
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Muted users
CREATE TABLE IF NOT EXISTS muted_users (
  muter_id UUID NOT NULL,
  muted_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id)
);

-- Post reports
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  post_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS community_posts_user_id_idx ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_is_demo_idx ON community_posts(is_demo);
CREATE INDEX IF NOT EXISTS community_posts_tags_idx ON community_posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_id);

CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS muted_users_muter_idx ON muted_users(muter_id);

-- Seed some demo posts for initial content
INSERT INTO community_posts (id, user_id, image_url, top_image, bottom_image, shoes_image, accessory_image, description, tags, likes_count, comments_count, is_demo)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Summer vibes outfit', ARRAY['casual', 'summer'], 234, 12, true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', NULL, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Evening elegance', ARRAY['elegant', 'evening'], 189, 8, true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', NULL, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400', 'https://images.unsplash.com/photo-1509941943102-10c232fc06e0?w=400', 'Urban streetwear look', ARRAY['streetwear', 'urban'], 421, 24, true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', NULL, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400', 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400', 'Clean minimal style', ARRAY['minimal', 'clean'], 156, 5, true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', NULL, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400', 'Professional smart casual', ARRAY['professional', 'smart'], 312, 15, true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', NULL, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400', 'https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=400', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400', 'Relaxed boho vibes', ARRAY['boho', 'relaxed'], 278, 11, true)
ON CONFLICT DO NOTHING;

-- Create demo users for the demo posts (if users table exists)
-- This is optional and depends on your users table structure
-- INSERT INTO users (id, display_name, avatar_url) VALUES ... ON CONFLICT DO NOTHING;
