-- Add missing GOLD metric columns to browser tables
-- Run this against your Cloud SQL PostgreSQL database

-- GOLD #5: Emotion at save (mood when bookmarking)
ALTER TABLE browser_bookmarks ADD COLUMN IF NOT EXISTS emotion_at_save TEXT;

-- GOLD #3: Session ID for cross-session tracking
ALTER TABLE browser_history ADD COLUMN IF NOT EXISTS session_id TEXT;

-- GOLD #3b: Cart page flag
ALTER TABLE browser_history ADD COLUMN IF NOT EXISTS is_cart_page BOOLEAN DEFAULT false;

-- GOLD #8: Body measurements at time of viewing (stored as JSON)
ALTER TABLE browser_bookmarks ADD COLUMN IF NOT EXISTS body_measurements_at_time JSONB;
ALTER TABLE browser_history ADD COLUMN IF NOT EXISTS body_measurements_at_time JSONB;

-- Index for session-based queries (cross-session analysis)
CREATE INDEX IF NOT EXISTS idx_browser_history_session ON browser_history(session_id);
CREATE INDEX IF NOT EXISTS idx_browser_history_cart_pages ON browser_history(user_id, is_cart_page) WHERE is_cart_page = true;
