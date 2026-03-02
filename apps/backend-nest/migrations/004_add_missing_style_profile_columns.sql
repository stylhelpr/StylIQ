-- Add columns that ALLOWED_COLUMNS / DTO reference but may not exist in DB yet.
-- Idempotent: safe to re-run. All columns are NULLABLE.
-- hip and shoulder_width are created here BEFORE any ALTER TYPE migration can run.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'color_preferences') THEN
    ALTER TABLE style_profiles ADD COLUMN color_preferences TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'fabric_preferences') THEN
    ALTER TABLE style_profiles ADD COLUMN fabric_preferences TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'occasions') THEN
    ALTER TABLE style_profiles ADD COLUMN occasions TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'trend_appetite') THEN
    ALTER TABLE style_profiles ADD COLUMN trend_appetite TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'unit_preference') THEN
    ALTER TABLE style_profiles ADD COLUMN unit_preference TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'prefs_jsonb') THEN
    ALTER TABLE style_profiles ADD COLUMN prefs_jsonb JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'hip') THEN
    ALTER TABLE style_profiles ADD COLUMN hip NUMERIC(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'style_profiles' AND column_name = 'shoulder_width') THEN
    ALTER TABLE style_profiles ADD COLUMN shoulder_width NUMERIC(10,2);
  END IF;
END $$;
