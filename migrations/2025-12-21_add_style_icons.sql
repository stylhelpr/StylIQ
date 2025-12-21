-- Add style_icons column to style_profiles table
ALTER TABLE style_profiles
ADD COLUMN IF NOT EXISTS style_icons TEXT[];
