-- Create saved_notes table for browser URL/text notes
CREATE TABLE IF NOT EXISTS saved_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  url TEXT,
  title VARCHAR(255),
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS saved_notes_user_id_idx ON saved_notes(user_id);
CREATE INDEX IF NOT EXISTS saved_notes_created_at_idx ON saved_notes(created_at DESC);
