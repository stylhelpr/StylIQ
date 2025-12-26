-- ============================================================
-- FAANG-Grade Gold Metrics Analytics Schema
-- Append-only event log with idempotency, GDPR compliance
-- Date: 2025-12-26
-- ============================================================

-- ============================================================
-- Shopping Analytics Event Log (Immutable, Append-Only)
-- ============================================================

CREATE TABLE shopping_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (from JWT, never client-supplied)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Idempotency key (from client, prevents duplicates)
  client_event_id UUID NOT NULL,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'scroll_depth', 'bookmark', 'cart_add', 'cart_remove',
    'purchase', 'size_click', 'color_click', 'price_check'
  )),

  -- Timing
  event_ts TIMESTAMPTZ NOT NULL,  -- When action occurred (client time)
  received_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Server time

  -- URL (sanitized: no query params, no hash)
  canonical_url TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Metadata
  session_id TEXT,  -- Client session ID
  title_sanitized TEXT,  -- Page title, max 200 chars, HTML-stripped

  -- Event payload (flexible, event-type-specific)
  payload JSONB NOT NULL,

  -- Compliance
  is_deleted BOOLEAN DEFAULT FALSE,  -- GDPR soft-delete

  -- Constraints
  UNIQUE (user_id, client_event_id),  -- Idempotency: exactly-once per client_event_id
  CONSTRAINT valid_url CHECK (canonical_url ~ '^https?://'),
  CONSTRAINT payload_not_empty CHECK (payload <> '{}'::jsonb)
);

-- Indexes for fast queries
CREATE INDEX idx_analytics_user_ts ON shopping_analytics_events(
  user_id, event_ts DESC
);

CREATE INDEX idx_analytics_type ON shopping_analytics_events(event_type);

CREATE INDEX idx_analytics_domain ON shopping_analytics_events(domain);

CREATE INDEX idx_analytics_url ON shopping_analytics_events(canonical_url);

CREATE INDEX idx_analytics_session ON shopping_analytics_events(
  user_id, session_id
) WHERE session_id IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX idx_analytics_payload ON shopping_analytics_events USING GIN(payload);

-- ============================================================
-- Materialized View: Current Bookmarks (Upserted)
-- ============================================================

CREATE TABLE shopping_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_url TEXT NOT NULL,
  domain TEXT NOT NULL,

  -- Latest values from most recent bookmark event
  title TEXT,
  category TEXT,
  brand TEXT,
  price_latest DECIMAL(10, 2),

  -- Aggregated metrics
  sizes_clicked TEXT[],  -- ["S", "M", "L"]
  colors_clicked TEXT[],  -- ["navy", "blue"]
  view_count INT DEFAULT 0,
  last_viewed_ts TIMESTAMPTZ,

  -- Tracking
  first_bookmarked_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, canonical_url)
);

CREATE INDEX idx_bookmarks_user ON shopping_bookmarks(user_id);
CREATE INDEX idx_bookmarks_domain ON shopping_bookmarks(domain);

-- ============================================================
-- Daily Rollups (For Fast Analytics Queries)
-- ============================================================

CREATE TABLE shopping_analytics_rollups_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,  -- UTC date

  -- Counts
  page_views INT DEFAULT 0,
  unique_products INT DEFAULT 0,
  unique_domains INT DEFAULT 0,
  bookmarks_created INT DEFAULT 0,
  cart_adds INT DEFAULT 0,
  purchases INT DEFAULT 0,

  -- Aggregates
  avg_dwell_time_sec DECIMAL(10, 2),
  avg_scroll_depth_pct DECIMAL(5, 2),

  -- Timestamp
  last_event_ts TIMESTAMPTZ,

  UNIQUE (user_id, date)
);

CREATE INDEX idx_rollups_user_date ON shopping_analytics_rollups_daily(
  user_id, date DESC
);

-- ============================================================
-- Retention Policy
-- ============================================================

-- Raw events: 12 months
-- Rollups: 24 months
-- (Managed via scheduled DELETE or pg_partman)

-- Example cleanup job (run daily):
-- DELETE FROM shopping_analytics_events
-- WHERE is_deleted = TRUE
--   AND received_ts < NOW() - INTERVAL '12 months';
