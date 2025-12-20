-- Direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS dm_sender_recipient_idx ON direct_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS dm_recipient_sender_idx ON direct_messages(recipient_id, sender_id);
CREATE INDEX IF NOT EXISTS dm_created_at_idx ON direct_messages(created_at DESC);

-- Conversations view (for listing chats)
-- Gets the latest message for each unique conversation
CREATE OR REPLACE VIEW conversations AS
SELECT DISTINCT ON (conversation_id)
  CASE
    WHEN sender_id < recipient_id THEN sender_id || '_' || recipient_id
    ELSE recipient_id || '_' || sender_id
  END as conversation_id,
  CASE
    WHEN sender_id < recipient_id THEN sender_id
    ELSE recipient_id
  END as user1_id,
  CASE
    WHEN sender_id < recipient_id THEN recipient_id
    ELSE sender_id
  END as user2_id,
  id as last_message_id,
  sender_id as last_sender_id,
  content as last_message,
  created_at as last_message_at,
  read_at
FROM direct_messages
ORDER BY conversation_id, created_at DESC;
