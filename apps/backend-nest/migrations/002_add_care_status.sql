ALTER TABLE wardrobe_items
  ADD COLUMN IF NOT EXISTS care_status TEXT NOT NULL DEFAULT 'available';
