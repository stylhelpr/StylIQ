-- Add P0 (hard constraints) and P1 (soft preferences) columns to style_profiles
-- These columns support the stylistBrain taste validator and elite scoring system.
-- Idempotent: safe to re-run on databases where columns already exist.

-- P0: Hard constraints

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'coverage_no_go') THEN
    ALTER TABLE style_profiles ADD COLUMN coverage_no_go TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'avoid_colors') THEN
    ALTER TABLE style_profiles ADD COLUMN avoid_colors TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'avoid_materials') THEN
    ALTER TABLE style_profiles ADD COLUMN avoid_materials TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'formality_floor') THEN
    ALTER TABLE style_profiles ADD COLUMN formality_floor TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'walkability_requirement') THEN
    ALTER TABLE style_profiles ADD COLUMN walkability_requirement TEXT;
  END IF;
END $$;

-- P1: Preference granularity

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'pattern_preferences') THEN
    ALTER TABLE style_profiles ADD COLUMN pattern_preferences TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'avoid_patterns') THEN
    ALTER TABLE style_profiles ADD COLUMN avoid_patterns TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'silhouette_preference') THEN
    ALTER TABLE style_profiles ADD COLUMN silhouette_preference TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'care_tolerance') THEN
    ALTER TABLE style_profiles ADD COLUMN care_tolerance TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'metal_preference') THEN
    ALTER TABLE style_profiles ADD COLUMN metal_preference TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'contrast_preference') THEN
    ALTER TABLE style_profiles ADD COLUMN contrast_preference TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'footwear_comfort') THEN
    ALTER TABLE style_profiles ADD COLUMN footwear_comfort TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'foot_width') THEN
    ALTER TABLE style_profiles ADD COLUMN foot_width TEXT;
  END IF;
END $$;
