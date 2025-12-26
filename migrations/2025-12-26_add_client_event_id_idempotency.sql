-- ============================================================
-- Add client_event_id for Idempotency (FIX #3)
-- ============================================================
-- This migration adds the client_event_id column to enable
-- exactly-once semantics for GOLD metrics.
--
-- Process:
-- 1. Add column as nullable
-- 2. Backfill existing rows with gen_random_uuid()
-- 3. Make NOT NULL after backfill
-- 4. Add UNIQUE constraint (user_id, client_event_id)
--
-- Date: 2025-12-26
-- ============================================================

-- ============================================================
-- A) browser_time_to_action - Add client_event_id
-- ============================================================

ALTER TABLE browser_time_to_action
ADD COLUMN client_event_id UUID;

-- Backfill existing rows with unique UUIDs
UPDATE browser_time_to_action
SET client_event_id = gen_random_uuid()
WHERE client_event_id IS NULL;

-- Make NOT NULL
ALTER TABLE browser_time_to_action
ALTER COLUMN client_event_id SET NOT NULL;

-- Add uniqueness constraint for idempotency
ALTER TABLE browser_time_to_action
ADD CONSTRAINT uq_time_to_action_user_event UNIQUE (user_id, client_event_id);

-- ============================================================
-- B) browser_product_interactions - Add client_event_id
-- ============================================================

ALTER TABLE browser_product_interactions
ADD COLUMN client_event_id UUID;

-- Backfill existing rows with unique UUIDs
UPDATE browser_product_interactions
SET client_event_id = gen_random_uuid()
WHERE client_event_id IS NULL;

-- Make NOT NULL
ALTER TABLE browser_product_interactions
ALTER COLUMN client_event_id SET NOT NULL;

-- Add uniqueness constraint for idempotency
ALTER TABLE browser_product_interactions
ADD CONSTRAINT uq_product_interactions_user_event UNIQUE (user_id, client_event_id);

-- ============================================================
-- Verification Queries (run after migration)
-- ============================================================

-- Check 1: Column exists in browser_time_to_action
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'browser_time_to_action'
-- AND column_name = 'client_event_id';

-- Check 2: Column exists in browser_product_interactions
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'browser_product_interactions'
-- AND column_name = 'client_event_id';

-- Check 3: UNIQUE constraint on browser_time_to_action
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'browser_time_to_action'
-- AND constraint_type = 'UNIQUE';

-- Check 4: UNIQUE constraint on browser_product_interactions
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'browser_product_interactions'
-- AND constraint_type = 'UNIQUE';

-- Check 5: No NULL values in browser_time_to_action
-- SELECT COUNT(*) FROM browser_time_to_action
-- WHERE client_event_id IS NULL;

-- Check 6: No NULL values in browser_product_interactions
-- SELECT COUNT(*) FROM browser_product_interactions
-- WHERE client_event_id IS NULL;

-- Check 7: No duplicates in browser_time_to_action
-- SELECT COUNT(*) FROM browser_time_to_action
-- WHERE client_event_id IN (
--   SELECT client_event_id FROM browser_time_to_action
--   GROUP BY user_id, client_event_id
--   HAVING COUNT(*) > 1
-- );

-- Check 8: No duplicates in browser_product_interactions
-- SELECT COUNT(*) FROM browser_product_interactions
-- WHERE client_event_id IN (
--   SELECT client_event_id FROM browser_product_interactions
--   GROUP BY user_id, client_event_id
--   HAVING COUNT(*) > 1
-- );

-- Check 9: Row count with client_event_id in browser_time_to_action
-- SELECT COUNT(*) as total_rows FROM browser_time_to_action
-- WHERE client_event_id IS NOT NULL;

-- Check 10: Row count with client_event_id in browser_product_interactions
-- SELECT COUNT(*) as total_rows FROM browser_product_interactions
-- WHERE client_event_id IS NOT NULL;
