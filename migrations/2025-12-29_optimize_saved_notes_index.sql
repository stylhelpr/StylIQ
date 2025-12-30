-- Composite index for efficient user notes query with ordering
-- This replaces the need to scan by user_id then sort by created_at separately
CREATE INDEX IF NOT EXISTS saved_notes_user_created_idx
ON saved_notes(user_id, created_at DESC);

-- Drop the redundant single-column created_at index since the composite covers it
DROP INDEX IF EXISTS saved_notes_created_at_idx;
