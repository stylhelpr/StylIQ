-- Migration: 001_learning_events.sql
-- Description: Cross-System Learning Loop - Event sourcing and derived state tables
-- Version: 1.2
-- Date: 2026-01-04
--
-- This migration creates the infrastructure for learning from user outcomes
-- across all AI features (outfit generation, shopping, community, discovery).
--
-- SAFETY: All features are OFF by default. This migration only creates tables.
-- No behavior changes until feature flags are explicitly enabled.

-- ============================================================================
-- 1. USER LEARNING EVENTS TABLE
-- ============================================================================
-- Append-only event log capturing user outcomes (ratings, purchases, saves, etc.)
-- Events are immutable after insertion. Aggregation happens in derived state.

CREATE TABLE IF NOT EXISTS user_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event identification
  event_type TEXT NOT NULL,
  event_ts TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Entity reference (what was acted upon)
  entity_type TEXT NOT NULL,  -- 'outfit', 'product', 'post', 'look', 'notification'
  entity_id TEXT,             -- UUID or external ID
  entity_signature TEXT,      -- Normalized hash for similarity matching

  -- Signal (separated polarity and weight for correct aggregation)
  signal_polarity SMALLINT NOT NULL CHECK (signal_polarity IN (-1, 0, 1)),
  signal_weight REAL NOT NULL CHECK (signal_weight >= 0.1 AND signal_weight <= 1.0),

  -- Context snapshot (denormalized for query efficiency)
  context JSONB NOT NULL DEFAULT '{}',
  -- Expected keys: weather_code, temp_f, season, occasion, location_type

  -- Extracted features for aggregation
  extracted_features JSONB NOT NULL DEFAULT '{}',
  -- Expected keys: brands[], colors[], categories[], styles[], tags[], materials[]

  -- Metadata
  source_feature TEXT NOT NULL,  -- 'outfit_generator', 'chat', 'shopping', 'community', 'discovery'
  client_event_id TEXT,          -- For idempotency (client-generated UUID)
  schema_version INT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query patterns: user + event type, user + time range
CREATE INDEX IF NOT EXISTS idx_ule_user_type
  ON user_learning_events(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_ule_user_ts
  ON user_learning_events(user_id, event_ts DESC);

-- Entity lookups: find events for specific entity
CREATE INDEX IF NOT EXISTS idx_ule_entity
  ON user_learning_events(user_id, entity_type, entity_id);

-- Similarity matching: group events by normalized signature
-- Required for aggregating preferences across similar items from different sources
CREATE INDEX IF NOT EXISTS idx_ule_signature
  ON user_learning_events(user_id, entity_signature)
  WHERE entity_signature IS NOT NULL;

-- Idempotency enforcement: prevent duplicate events from client retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_ule_idempotent
  ON user_learning_events(user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

-- ============================================================================
-- 2. USER FASHION STATE TABLE
-- ============================================================================
-- Derived/materialized aggregation of user preferences from events.
-- Computed periodically by background job. Can be fully rebuilt from events.

CREATE TABLE IF NOT EXISTS user_fashion_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Affinity scores (JSONB maps: key -> score in [-3, +5])
  -- Negative scores indicate dislike, positive indicate preference
  -- Asymmetric bounds: harder to permanently blacklist than to establish preference
  brand_scores JSONB NOT NULL DEFAULT '{}',
  color_scores JSONB NOT NULL DEFAULT '{}',
  category_scores JSONB NOT NULL DEFAULT '{}',
  style_scores JSONB NOT NULL DEFAULT '{}',
  material_scores JSONB NOT NULL DEFAULT '{}',
  tag_scores JSONB NOT NULL DEFAULT '{}',

  -- Fit feedback (derived from returns and negative ratings)
  fit_issues JSONB NOT NULL DEFAULT '{}',
  -- e.g., {"too_tight": 2, "too_long": 1}

  -- Behavioral signals
  avg_purchase_price NUMERIC(10,2),
  price_bracket TEXT CHECK (price_bracket IN ('budget', 'mid', 'premium', 'luxury', NULL)),
  occasion_frequency JSONB NOT NULL DEFAULT '{}',
  -- e.g., {"casual": 15, "business": 8, "formal": 2}

  -- Computation metadata
  events_processed_count INT NOT NULL DEFAULT 0,
  events_last_id UUID,  -- For incremental updates (future optimization)
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state_version INT NOT NULL DEFAULT 1,

  -- Cold start flag: true until user has >= 10 explicit signal events
  -- When true, consumers should prefer style_profiles over this state
  is_cold_start BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for finding stale states that need recomputation
CREATE INDEX IF NOT EXISTS idx_ufs_updated
  ON user_fashion_state(last_computed_at);

-- ============================================================================
-- 3. USER CONSENT COLUMN
-- ============================================================================
-- Learning is OFF by default. User must explicitly opt in.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS learning_consent BOOLEAN DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS learning_consent_ts TIMESTAMPTZ;

-- ============================================================================
-- 4. GRANULAR LEARNING PREFERENCES (Optional, for future use)
-- ============================================================================
-- Allows users to control which features contribute to learning

CREATE TABLE IF NOT EXISTS user_learning_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enable_outfit_learning BOOLEAN DEFAULT true,
  enable_shopping_learning BOOLEAN DEFAULT true,
  enable_social_learning BOOLEAN DEFAULT true,
  enable_discovery_learning BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_learning_events IS
  'Append-only event log for cross-system learning. Events are immutable after insertion.';

COMMENT ON COLUMN user_learning_events.signal_polarity IS
  'Direction of signal: -1 (negative/dislike), 0 (neutral/impression), +1 (positive/like)';

COMMENT ON COLUMN user_learning_events.signal_weight IS
  'Strength of signal from 0.1 (weak) to 1.0 (strong). E.g., purchase=1.0, like=0.3';

COMMENT ON COLUMN user_learning_events.entity_signature IS
  'Normalized hash for similarity matching. SHA256(canonical_identifier)[0:32]';

COMMENT ON TABLE user_fashion_state IS
  'Derived state computed from user_learning_events. Can be fully rebuilt from events.';

COMMENT ON COLUMN user_fashion_state.is_cold_start IS
  'True until user has >= 10 explicit signal events. Consumers should use style_profiles as primary.';

COMMENT ON COLUMN users.learning_consent IS
  'User consent for learning features. Must be true for events to be logged.';
