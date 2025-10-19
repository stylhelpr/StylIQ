-- Generation logs
CREATE TABLE IF NOT EXISTS outfit_generations (
  request_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  weights_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidates_json JSONB NOT NULL,      -- [{outfit_id, item_ids[], base_score}]
  chosen_outfit_json JSONB NOT NULL,   -- {outfit_id, item_ids[], base_score}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outfit_generations_user_created
  ON outfit_generations (user_id, created_at DESC);

-- Feedback events (new table; keeps your older outfit_feedback table untouched)
CREATE TABLE IF NOT EXISTS outfit_feedback_events (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES outfit_generations(request_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  outfit_json JSONB NOT NULL,          -- {outfit_id, item_ids[], items?}
  rating INT NOT NULL,                 -- -1 (dislike) or 1..5
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ofe_user_created
  ON outfit_feedback_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ofe_request
  ON outfit_feedback_events (request_id);

-- User + global preference stores
CREATE TABLE IF NOT EXISTS user_pref_feature (
  user_id TEXT NOT NULL,
  feature TEXT NOT NULL,               -- e.g. "color:Blue"
  score REAL NOT NULL DEFAULT 0,       -- clamp to [-5, 5]
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

CREATE TABLE IF NOT EXISTS user_pref_item (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,       -- clamp to [-5, 5]
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS global_item_quality (
  item_id TEXT PRIMARY KEY,
  score REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_feature_quality (
  feature TEXT PRIMARY KEY,
  score REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_pref_item_topneg
  ON user_pref_item (user_id, score) WHERE score <= -4;
