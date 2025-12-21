-- Add budget_min and budget_max columns to style_profiles table
-- Replaces the single budget_level field with a range

ALTER TABLE style_profiles
ADD COLUMN IF NOT EXISTS budget_min INTEGER,
ADD COLUMN IF NOT EXISTS budget_max INTEGER;

-- Migrate existing budget_level data to budget_max (treating old single value as max)
UPDATE style_profiles
SET budget_max = budget_level
WHERE budget_level IS NOT NULL;
