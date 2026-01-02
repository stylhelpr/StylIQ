-- Migration: Add processed image columns for background-removed garment images
-- This supports the garment background removal feature for single wardrobe uploads
-- Run: psql $DATABASE_URL -f add-processed-image-columns.sql

ALTER TABLE wardrobe_items
ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
ADD COLUMN IF NOT EXISTS processed_gsutil_uri TEXT;

-- Add comment for documentation
COMMENT ON COLUMN wardrobe_items.processed_image_url IS 'Public URL of background-removed transparent image (PNG)';
COMMENT ON COLUMN wardrobe_items.processed_gsutil_uri IS 'GCS URI of background-removed transparent image (gs://...)';
