-- Fix browser_history to have unique constraint on (user_id, url)
-- This prevents duplicate entries and allows proper visit count tracking

-- First, deduplicate existing data by keeping only ONE entry per (user_id, url)
-- Keep the one with the highest visit_count and most recent visited_at
DELETE FROM browser_history
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, url) id
  FROM browser_history
  ORDER BY user_id, url, visit_count DESC, visited_at DESC
);

-- Now add the unique constraint
ALTER TABLE browser_history
ADD CONSTRAINT unique_user_history_url UNIQUE (user_id, url);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_browser_history_user_url ON browser_history(user_id, url);
