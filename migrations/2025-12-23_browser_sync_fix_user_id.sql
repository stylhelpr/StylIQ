-- Fix user_id columns to use TEXT instead of UUID
-- Auth0 user IDs are strings like "auth0|6843042396a28901c3b20506"

-- Drop existing tables and recreate with TEXT user_id
-- (Since these are new tables with no production data yet)

DROP TABLE IF EXISTS browser_collection_items CASCADE;
DROP TABLE IF EXISTS browser_collections CASCADE;
DROP TABLE IF EXISTS browser_history CASCADE;
DROP TABLE IF EXISTS browser_bookmarks CASCADE;
DROP TABLE IF EXISTS user_browser_limits CASCADE;

-- Bookmarks table
CREATE TABLE browser_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    favicon_url TEXT,
    price DECIMAL(10,2),
    price_history JSONB DEFAULT '[]',
    brand TEXT,
    category TEXT,
    source TEXT,
    sizes_viewed TEXT[] DEFAULT '{}',
    colors_viewed TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 1,
    last_viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT unique_user_bookmark UNIQUE (user_id, url)
);

CREATE INDEX idx_browser_bookmarks_user_id ON browser_bookmarks(user_id);
CREATE INDEX idx_browser_bookmarks_user_updated ON browser_bookmarks(user_id, updated_at DESC);

-- History table
CREATE TABLE browser_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    source TEXT,
    brand TEXT,
    dwell_time_seconds INTEGER DEFAULT 0,
    scroll_depth_percent SMALLINT DEFAULT 0,
    visit_count INTEGER DEFAULT 1,
    visited_at TIMESTAMP DEFAULT now(),

    CONSTRAINT valid_scroll_depth CHECK (scroll_depth_percent >= 0 AND scroll_depth_percent <= 100)
);

CREATE INDEX idx_browser_history_user_visited ON browser_history(user_id, visited_at DESC);
CREATE INDEX idx_browser_history_cleanup ON browser_history(visited_at);

-- Collections table
CREATE TABLE browser_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT unique_user_collection_name UNIQUE (user_id, name)
);

CREATE INDEX idx_browser_collections_user_id ON browser_collections(user_id);

-- Collection items junction table
CREATE TABLE browser_collection_items (
    collection_id UUID NOT NULL REFERENCES browser_collections(id) ON DELETE CASCADE,
    bookmark_id UUID NOT NULL REFERENCES browser_bookmarks(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT now(),

    PRIMARY KEY (collection_id, bookmark_id)
);

-- User storage limits (for future premium tiers)
CREATE TABLE user_browser_limits (
    user_id TEXT PRIMARY KEY,
    max_bookmarks INTEGER DEFAULT 200,
    max_history_days INTEGER DEFAULT 90,
    max_collections INTEGER DEFAULT 10,
    tier TEXT DEFAULT 'free',
    updated_at TIMESTAMP DEFAULT now()
);

-- Triggers for updated_at (recreate since tables were dropped)
DROP TRIGGER IF EXISTS update_browser_bookmarks_updated_at ON browser_bookmarks;
CREATE TRIGGER update_browser_bookmarks_updated_at
    BEFORE UPDATE ON browser_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_browser_collections_updated_at ON browser_collections;
CREATE TRIGGER update_browser_collections_updated_at
    BEFORE UPDATE ON browser_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
