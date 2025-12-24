-- Browser Sync Tables Migration
-- Run this against your Cloud SQL PostgreSQL database

-- Bookmarks table
CREATE TABLE IF NOT EXISTS browser_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_browser_bookmarks_user_id ON browser_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_bookmarks_user_updated ON browser_bookmarks(user_id, updated_at DESC);

-- History table
CREATE TABLE IF NOT EXISTS browser_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    source TEXT,
    dwell_time_seconds INTEGER DEFAULT 0,
    scroll_depth_percent SMALLINT DEFAULT 0,
    visit_count INTEGER DEFAULT 1,
    visited_at TIMESTAMP DEFAULT now(),

    CONSTRAINT valid_scroll_depth CHECK (scroll_depth_percent >= 0 AND scroll_depth_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_browser_history_user_visited ON browser_history(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_history_cleanup ON browser_history(visited_at);

-- Collections table
CREATE TABLE IF NOT EXISTS browser_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT unique_user_collection_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_browser_collections_user_id ON browser_collections(user_id);

-- Collection items junction table
CREATE TABLE IF NOT EXISTS browser_collection_items (
    collection_id UUID NOT NULL REFERENCES browser_collections(id) ON DELETE CASCADE,
    bookmark_id UUID NOT NULL REFERENCES browser_bookmarks(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT now(),

    PRIMARY KEY (collection_id, bookmark_id)
);

-- User storage limits (for future premium tiers)
CREATE TABLE IF NOT EXISTS user_browser_limits (
    user_id UUID PRIMARY KEY,
    max_bookmarks INTEGER DEFAULT 200,
    max_history_days INTEGER DEFAULT 90,
    max_collections INTEGER DEFAULT 10,
    tier TEXT DEFAULT 'free',
    updated_at TIMESTAMP DEFAULT now()
);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
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

-- Cart history table (for spending tracking)
CREATE TABLE IF NOT EXISTS browser_cart_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cart_url TEXT NOT NULL,
    abandoned BOOLEAN DEFAULT false,
    time_to_checkout INTEGER, -- seconds from first event to checkout_complete
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),

    CONSTRAINT unique_user_cart UNIQUE (user_id, cart_url)
);

CREATE INDEX IF NOT EXISTS idx_browser_cart_history_user_id ON browser_cart_history(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_cart_history_user_updated ON browser_cart_history(user_id, updated_at DESC);

-- Cart events table (individual events within a cart session)
CREATE TABLE IF NOT EXISTS browser_cart_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_history_id UUID NOT NULL REFERENCES browser_cart_history(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'add', 'remove', 'checkout_start', 'checkout_complete', 'cart_view'
    timestamp BIGINT NOT NULL, -- JS timestamp (milliseconds)
    cart_url TEXT NOT NULL,
    item_count INTEGER,
    cart_value DECIMAL(10,2),
    items JSONB DEFAULT '[]', -- [{title, price, quantity}]

    CONSTRAINT valid_event_type CHECK (event_type IN ('add', 'remove', 'checkout_start', 'checkout_complete', 'cart_view'))
);

CREATE INDEX IF NOT EXISTS idx_browser_cart_events_cart_history ON browser_cart_events(cart_history_id);

-- Trigger for cart history updated_at
DROP TRIGGER IF EXISTS update_browser_cart_history_updated_at ON browser_cart_history;
CREATE TRIGGER update_browser_cart_history_updated_at
    BEFORE UPDATE ON browser_cart_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old history (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_browser_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM browser_history
        WHERE visited_at < now() - INTERVAL '90 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Cleanup function for old cart history (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_cart_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM browser_cart_history
        WHERE updated_at < now() - INTERVAL '365 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ language 'plpgsql';
