-- Add all_measurements JSONB column to style_profiles
ALTER TABLE style_profiles
ADD COLUMN IF NOT EXISTS all_measurements JSONB DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS style_profiles_all_measurements_gin
ON style_profiles USING GIN (all_measurements);
