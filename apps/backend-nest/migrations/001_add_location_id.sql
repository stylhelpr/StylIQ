-- Multi-Location Wardrobe MVP
-- Run BEFORE deploying backend code that writes location_id
-- Rollback: ALTER TABLE wardrobe_items DROP COLUMN IF EXISTS location_id;
ALTER TABLE wardrobe_items
  ADD COLUMN IF NOT EXISTS location_id TEXT NOT NULL DEFAULT 'home';
