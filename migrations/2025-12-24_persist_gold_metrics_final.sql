-- FINAL GOLD METRICS PERSISTENCE
-- Persist Time-to-Action and Product Interactions to Postgres
-- Run this against your Cloud SQL PostgreSQL database

-- ============================================
-- A) TIME-TO-ACTION EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS browser_time_to_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT,
    product_url TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('bookmark', 'cart')),
    time_to_action_seconds NUMERIC(10, 2) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT fk_time_to_action_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_time_to_action_user ON browser_time_to_action(user_id);
CREATE INDEX IF NOT EXISTS idx_time_to_action_action_type ON browser_time_to_action(action_type);
CREATE INDEX IF NOT EXISTS idx_time_to_action_occurred ON browser_time_to_action(occurred_at);
CREATE INDEX IF NOT EXISTS idx_time_to_action_session ON browser_time_to_action(session_id);

-- ============================================
-- B) PRODUCT INTERACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS browser_product_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT,
    product_url TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'view', 'add_to_cart', 'bookmark',
        'size_click', 'color_click', 'image_long_press',
        'price_check', 'scroll', 'share'
    )),
    metadata JSONB DEFAULT '{}',
    body_measurements_at_time JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT fk_product_interactions_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_product_interactions_user ON browser_product_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_interactions_type ON browser_product_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_product_interactions_occurred ON browser_product_interactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_product_interactions_session ON browser_product_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_product_interactions_url ON browser_product_interactions(product_url);

-- ============================================
-- C) DERIVED METRICS VIEWS (No storage, queryable)
-- ============================================

-- VIEW: Size-Switch Frequency per product
CREATE OR REPLACE VIEW v_size_switch_frequency AS
SELECT
    user_id,
    url,
    title,
    array_length(sizes_viewed, 1) AS size_switch_count,
    sizes_viewed
FROM browser_bookmarks
WHERE array_length(sizes_viewed, 1) > 0;

-- VIEW: Cross-Session Product Views
CREATE OR REPLACE VIEW v_cross_session_products AS
SELECT
    user_id,
    url,
    title,
    COUNT(DISTINCT session_id) AS session_count,
    SUM(visit_count) AS total_views,
    array_agg(DISTINCT session_id) AS sessions
FROM browser_history
WHERE session_id IS NOT NULL
GROUP BY user_id, url, title
HAVING COUNT(DISTINCT session_id) >= 2
ORDER BY session_count DESC;

-- VIEW: Brand Affinity Scores
CREATE OR REPLACE VIEW v_brand_affinity AS
WITH user_brand_views AS (
    SELECT
        user_id,
        brand,
        SUM(visit_count) AS view_count
    FROM browser_history
    WHERE brand IS NOT NULL
    GROUP BY user_id, brand
),
user_totals AS (
    SELECT
        user_id,
        SUM(view_count) AS total_views
    FROM user_brand_views
    GROUP BY user_id
)
SELECT
    ubv.user_id,
    ubv.brand,
    ubv.view_count,
    ROUND(100.0 * ubv.view_count / ut.total_views, 1) AS affinity_score
FROM user_brand_views ubv
JOIN user_totals ut ON ubv.user_id = ut.user_id
ORDER BY ubv.user_id, affinity_score DESC;

-- VIEW: Average Time-to-Action by action type
CREATE OR REPLACE VIEW v_avg_time_to_action AS
SELECT
    user_id,
    action_type,
    COUNT(*) AS event_count,
    ROUND(AVG(time_to_action_seconds), 2) AS avg_seconds,
    ROUND(MIN(time_to_action_seconds), 2) AS min_seconds,
    ROUND(MAX(time_to_action_seconds), 2) AS max_seconds
FROM browser_time_to_action
GROUP BY user_id, action_type;

-- VIEW: Product Interaction Summary
CREATE OR REPLACE VIEW v_product_interaction_summary AS
SELECT
    user_id,
    product_url,
    COUNT(*) AS total_interactions,
    COUNT(DISTINCT session_id) AS unique_sessions,
    jsonb_object_agg(interaction_type, interaction_count) AS interaction_breakdown
FROM (
    SELECT
        user_id,
        product_url,
        session_id,
        interaction_type,
        COUNT(*) AS interaction_count
    FROM browser_product_interactions
    GROUP BY user_id, product_url, session_id, interaction_type
) sub
GROUP BY user_id, product_url;
