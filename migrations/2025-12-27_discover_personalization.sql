-- Personalized Discover Products Migration
-- Weekly refresh per user, stored in DB (not AsyncStorage)

-- Add refresh timestamp to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_discover_refresh TIMESTAMPTZ;

-- User-specific cached discover products
CREATE TABLE IF NOT EXISTS user_discover_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,  -- external product ID from SerpAPI
    title TEXT NOT NULL,
    brand TEXT,
    price DECIMAL(10,2),
    price_raw TEXT,  -- original price string
    image_url TEXT NOT NULL,
    link TEXT NOT NULL,
    source TEXT,  -- retailer name
    category TEXT,
    position INTEGER,  -- 1-10 ranking
    search_query TEXT,  -- what query generated this
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_discover_user_id ON user_discover_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discover_user_position ON user_discover_products(user_id, position);

-- Track which products we've already shown to avoid repeats
CREATE TABLE IF NOT EXISTS user_discover_history (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    shown_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_discover_history_user ON user_discover_history(user_id);
