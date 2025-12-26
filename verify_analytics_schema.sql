-- ========================================================================
-- ANALYTICS SCHEMA VERIFICATION SCRIPT
-- Run this to verify all tables, constraints, and indexes exist
-- Date: 2025-12-26
-- ========================================================================

\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║         ANALYTICS SCHEMA VERIFICATION                        ║'
\echo '║                                                                ║'
\echo '║  This script verifies Phase 1 migrations are correct          ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '1. VERIFY TABLES EXIST'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc WHERE tc.table_name = t.tablename) as constraint_count
FROM pg_tables t
WHERE schemaname = 'public' AND tablename LIKE 'shopping_%'
ORDER BY tablename;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '2. VERIFY UNIQUE CONSTRAINT (Idempotency)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  constraint_name,
  constraint_type,
  table_name,
  column_name
FROM (
  SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    ROW_NUMBER() OVER (PARTITION BY tc.constraint_name ORDER BY kcu.ordinal_position) as col_order
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'shopping_analytics_events' AND tc.constraint_type = 'UNIQUE'
) sub
ORDER BY constraint_name, col_order;

\echo ''
\echo 'Expected: Constraint with columns (user_id, client_event_id)'
\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '3. VERIFY SOFT-DELETE COLUMN EXISTS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shopping_analytics_events' AND column_name = 'is_deleted';

\echo ''
\echo 'Expected: is_deleted | boolean | false | NO'
\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '4. VERIFY INDEXES EXIST'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'shopping_%'
ORDER BY tablename, indexname;

\echo ''
\echo 'Expected: 7 indexes on shopping_analytics_events'
\echo '          - idx_analytics_user_ts'
\echo '          - idx_analytics_type'
\echo '          - idx_analytics_domain'
\echo '          - idx_analytics_url'
\echo '          - idx_analytics_session'
\echo '          - idx_analytics_payload (GIN)'
\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '5. VERIFY COLUMN COUNT'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'shopping_analytics_events';

\echo ''
\echo 'Expected: 12 columns'
\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '6. COUNT TOTAL EVENTS IN DATABASE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_events,
  COUNT(*) FILTER (WHERE is_deleted = TRUE) as deleted_events
FROM shopping_analytics_events;

\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '7. COUNT BY EVENT TYPE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  event_type,
  COUNT(*) as count
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY event_type
ORDER BY count DESC;

\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '8. COUNT BY USER'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  user_id,
  COUNT(*) as event_count
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 10;

\echo ''

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '9. RECENT EVENTS (Last 5)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  id,
  user_id,
  event_type,
  event_ts,
  canonical_url,
  is_deleted,
  received_ts
FROM shopping_analytics_events
WHERE is_deleted = FALSE
ORDER BY received_ts DESC
LIMIT 5;

\echo ''

\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  VERIFICATION COMPLETE                                        ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''
