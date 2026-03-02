-- Add disliked column for thumbs-down UI state persistence
ALTER TABLE user_discover_products
ADD COLUMN IF NOT EXISTS disliked BOOLEAN DEFAULT FALSE;
