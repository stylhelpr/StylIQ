-- === Step 1: Enrich wardrobe_items (minimal, high-signal fields) ===

-- 1) enums
DO $$ BEGIN
  CREATE TYPE seasonality AS ENUM ('SS', 'FW', 'ALL_SEASON');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE layering_role AS ENUM ('BASE', 'MID', 'SHELL', 'ACCENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pattern_type AS ENUM ('SOLID','STRIPE','CHECK','HERRINGBONE','WINDOWPANE','FLORAL','DOT','CAMO','ABSTRACT','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) new columns (nullable first to avoid backfill pressure)
ALTER TABLE wardrobe_items
  ADD COLUMN IF NOT EXISTS formality_range_small INT,              -- 0..100 (store as smallint-ish)
  ADD COLUMN IF NOT EXISTS seasonality seasonality,                -- SS/FW/ALL_SEASON
  ADD COLUMN IF NOT EXISTS layering layering_role,                 -- BASE/MID/SHELL/ACCENT
  ADD COLUMN IF NOT EXISTS dominant_hex VARCHAR(7),                -- '#RRGGBB'
  ADD COLUMN IF NOT EXISTS palette_hex TEXT[],                     -- array of '#RRGGBB'
  ADD COLUMN IF NOT EXISTS color_family TEXT,                      -- 'black','navy','camel', etc.
  ADD COLUMN IF NOT EXISTS pattern pattern_type,
  ADD COLUMN IF NOT EXISTS pattern_scale TEXT,                     -- 'subtle'|'medium'|'bold'
  ADD COLUMN IF NOT EXISTS fabric_primary TEXT,                    -- e.g. 'Cotton'
  ADD COLUMN IF NOT EXISTS fabric_blend JSONB,                     -- [{material:'Elastane',percent:2}, ...]
  ADD COLUMN IF NOT EXISTS stretch_pct SMALLINT,                   -- 0..100
  ADD COLUMN IF NOT EXISTS thickness TEXT,                         -- 'thin'|'medium'|'thick'
  ADD COLUMN IF NOT EXISTS thermal_rating REAL,                    -- 0..1
  ADD COLUMN IF NOT EXISTS breathability REAL,                     -- 0..1
  ADD COLUMN IF NOT EXISTS rain_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS wind_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS size_system TEXT,                       -- 'US'|'EU'|'UK'|'alpha'
  ADD COLUMN IF NOT EXISTS measurements JSONB,                     -- category-specific numeric map
  ADD COLUMN IF NOT EXISTS care_symbols TEXT[],                    -- e.g. ISO symbol codes
  ADD COLUMN IF NOT EXISTS wash_temp_c SMALLINT,
  ADD COLUMN IF NOT EXISTS dry_clean BOOLEAN,
  ADD COLUMN IF NOT EXISTS iron_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS wear_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_worn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotation_priority SMALLINT;             -- -1..+1

-- 3) light backfill from existing columns if available
UPDATE wardrobe_items
SET
  fabric_primary = COALESCE(fabric_primary, NULLIF(material, '')),
  color_family   = COALESCE(color_family, NULLIF(color, ''))
WHERE TRUE;

-- Optional: if you already store a generic 'fit' (Slim/Regular/etc), keep it in place. We don't drop anything here.

-- 4) indices for filters
CREATE INDEX IF NOT EXISTS wardrobe_items_seasonality_idx ON wardrobe_items(seasonality);
CREATE INDEX IF NOT EXISTS wardrobe_items_layering_idx    ON wardrobe_items(layering);
CREATE INDEX IF NOT EXISTS wardrobe_items_color_family_idx ON wardrobe_items(LOWER(color_family));
CREATE INDEX IF NOT EXISTS wardrobe_items_pattern_idx     ON wardrobe_items(pattern);
CREATE INDEX IF NOT EXISTS wardrobe_items_formality_idx   ON wardrobe_items(formality_range_small);
CREATE INDEX IF NOT EXISTS wardrobe_items_palette_gin     ON wardrobe_items USING GIN (palette_hex);
CREATE INDEX IF NOT EXISTS wardrobe_items_measurements_gin ON wardrobe_items USING GIN ((measurements));

CREATE INDEX IF NOT EXISTS wardrobe_items_care_symbols_gin
  ON wardrobe_items USING GIN (care_symbols);
-- 5) NOTE: We are NOT enforcing NOT NULL yet. We'll add constraints later when you have data in place.
