-- Browser tabs table for syncing open tabs across devices
-- Each user can have up to 50 open tabs

CREATE TABLE IF NOT EXISTS browser_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tab_id VARCHAR(100) NOT NULL, -- Client-side tab ID (e.g., "tab_1234567890")
  url TEXT NOT NULL,
  title VARCHAR(500),
  position INTEGER DEFAULT 0, -- Tab order
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tab_id)
);

-- Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_browser_tabs_user_id ON browser_tabs(user_id);

-- Store current active tab per user
CREATE TABLE IF NOT EXISTS browser_tab_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_tab_id VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
