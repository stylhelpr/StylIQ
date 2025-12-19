-- Add height, weight, and shoe_size columns to style_profiles table
ALTER TABLE style_profiles
ADD COLUMN IF NOT EXISTS height NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS shoe_size NUMERIC(10, 2);
