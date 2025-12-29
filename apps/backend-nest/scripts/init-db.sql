-- ========================
-- REQUIRED EXTENSIONS
-- ========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- USERS TABLE
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_sub TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  profile_picture TEXT,
  country TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- STYLE PROFILE
-- ========================
CREATE TABLE style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  body_type TEXT,
  skin_tone TEXT,
  undertone TEXT,
  climate TEXT,
  favorite_colors TEXT[],
  disliked_styles TEXT[],
  style_keywords TEXT[],
  budget_level TEXT,
  preferred_brands TEXT[],
  daily_activities TEXT[],
  goals TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- MAIN CATEGORY ENUM
-- ========================
CREATE TYPE main_category AS ENUM (
  'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories',
  'Undergarments', 'Activewear', 'Formalwear', 'Loungewear',
  'Sleepwear', 'Swimwear', 'Maternity', 'Unisex', 'Costumes', 'Traditional Wear'
);

-- ========================
-- WARDROBE ITEMS
-- ========================
CREATE TABLE wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  name TEXT,
  main_category main_category NOT NULL,
  subcategory TEXT,
  color TEXT,
  material TEXT,
  fit TEXT,
  size TEXT,
  brand TEXT,
  metadata JSONB,
  embedding_vector FLOAT8[], -- for Pinecone
  width INTEGER,
  height INTEGER,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wardrobe_user ON wardrobe_items(user_id);
CREATE INDEX idx_main_category ON wardrobe_items(main_category);
CREATE INDEX idx_wardrobe_embedding ON wardrobe_items USING gin (embedding_vector);

-- ========================
-- AI-GENERATED OUTFIT SUGGESTIONS
-- ========================
CREATE TABLE outfit_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  top_id UUID REFERENCES wardrobe_items(id),
  bottom_id UUID REFERENCES wardrobe_items(id),
  shoes_id UUID REFERENCES wardrobe_items(id),
  accessory_ids UUID[],
  weather_data JSONB,
  location TEXT,
  suggested_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outfits_user_id ON outfit_suggestions(user_id);

-- ========================
-- USER-CREATED CUSTOM OUTFITS
-- ========================
CREATE TABLE custom_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  top_id UUID REFERENCES wardrobe_items(id),
  bottom_id UUID REFERENCES wardrobe_items(id),
  shoes_id UUID REFERENCES wardrobe_items(id),
  accessory_ids UUID[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- SCHEDULED OUTFIT PLANNER
-- ========================
CREATE TABLE scheduled_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_outfit_id UUID REFERENCES outfit_suggestions(id) ON DELETE SET NULL,
  custom_outfit_id UUID REFERENCES custom_outfits(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- OUTFIT FEEDBACK
-- ========================
CREATE TABLE outfit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfit_suggestions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- FAVORITE OUTFITS
-- ========================
CREATE TABLE outfit_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfit_suggestions(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, outfit_id)
);

-- ========================
-- PUSH TOKENS (FCM)
-- ========================
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);


-- ========================
-- IMAGE UPLOAD EVENTS
-- ========================
CREATE TABLE image_upload_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wardrobe_item_id UUID REFERENCES wardrobe_items(id) ON DELETE SET NULL,
  file_name TEXT,
  width INT,
  height INT,
  ai_tags JSONB,
  embedding_vector FLOAT8[],
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- SEARCH PROMPT LOGS
-- ========================
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  prompt TEXT,
  result_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- USER SUBSCRIPTIONS
-- ========================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,         -- maps to Stripe
  stripe_subscription_id TEXT,     -- maps to Stripe sub
  plan TEXT NOT NULL,              -- e.g. 'free', 'pro', 'enterprise'
  status TEXT NOT NULL,            -- e.g. 'active', 'past_due', 'canceled'
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- EXTEND STYLE PROFILE TO MATCH FULL UI
-- ========================
ALTER TABLE style_profiles
-- Appearance
ADD COLUMN proportions TEXT,
ADD COLUMN hair_color TEXT,
ADD COLUMN eye_color TEXT,

-- Measurements
ADD COLUMN height TEXT,
ADD COLUMN weight TEXT,
ADD COLUMN chest TEXT,
ADD COLUMN waist TEXT,
ADD COLUMN inseam TEXT,
ADD COLUMN shoe_size TEXT,

-- Preferences
ADD COLUMN style_preferences TEXT[],
ADD COLUMN fit_preferences TEXT[],
ADD COLUMN fashion_confidence TEXT,
ADD COLUMN fashion_boldness TEXT,

-- Additional fields
ADD COLUMN shopping_habits TEXT[],
ADD COLUMN personality_traits TEXT[],
ADD COLUMN lifestyle_notes TEXT,
ADD COLUMN is_style_profile_complete BOOLEAN DEFAULT false;

-- ========================
-- SAVED NOTES
-- ========================
CREATE TABLE IF NOT EXISTS saved_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  url TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  color TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_notes_user ON saved_notes(user_id);

-- Add color column if it doesn't exist (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_notes' AND column_name = 'color'
  ) THEN
    ALTER TABLE saved_notes ADD COLUMN color TEXT;
  END IF;
END $$;

-- Add image_url column if it doesn't exist (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_notes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE saved_notes ADD COLUMN image_url TEXT;
  END IF;
END $$;
