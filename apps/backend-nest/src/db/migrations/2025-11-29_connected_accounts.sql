-- Connected Accounts Table
-- Stores OAuth connections for social media platforms (Instagram, TikTok, Pinterest, etc.)

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  username TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id
  ON connected_accounts (user_id);

-- Index for platform lookups
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform
  ON connected_accounts (platform);

-- Index for user + platform (already covered by UNIQUE constraint, but for clarity)
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_platform
  ON connected_accounts (user_id, platform);
