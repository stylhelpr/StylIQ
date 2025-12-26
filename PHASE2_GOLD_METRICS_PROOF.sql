-- PHASE 2: WebBrowser Analytics GOLD Metrics — Database Verification Queries
-- Run these queries against production database to verify compliance
-- Usage: psql -U postgres -h 35.192.165.144 -d stylhelpr-sql -f PHASE2_GOLD_METRICS_PROOF.sql

-- ==============================================================================
-- QUERY 1: Verify browser_bookmarks table exists with correct schema
-- ==============================================================================
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'browser_bookmarks'
ORDER BY ordinal_position;

-- Expected columns: id, user_id, url, title, favicon_url, price, price_history,
--                   brand, category, source, sizes_viewed, colors_viewed,
--                   view_count, last_viewed_at, emotion_at_save,
--                   body_measurements_at_time, created_at, updated_at

-- ==============================================================================
-- QUERY 2: Verify GOLD metrics tables exist
-- ==============================================================================
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('browser_time_to_action', 'browser_product_interactions')
ORDER BY table_name;

-- Expected result: 2 rows
-- - browser_product_interactions
-- - browser_time_to_action

-- ==============================================================================
-- QUERY 3: Count bookmarks by user (GOLD #1-10 aggregated)
-- ==============================================================================
SELECT
  user_id,
  COUNT(*) as total_bookmarks,
  COUNT(DISTINCT url) as unique_urls,
  COUNT(CASE WHEN emotion_at_save IS NOT NULL THEN 1 END) as bookmarks_with_emotion,
  COUNT(CASE WHEN body_measurements_at_time IS NOT NULL THEN 1 END) as bookmarks_with_measurements,
  COUNT(CASE WHEN price_history IS NOT NULL THEN 1 END) as bookmarks_with_price_history,
  COUNT(CASE WHEN sizes_viewed IS NOT NULL AND array_length(sizes_viewed, 1) > 0 THEN 1 END) as bookmarks_with_sizes,
  COUNT(CASE WHEN colors_viewed IS NOT NULL AND array_length(colors_viewed, 1) > 0 THEN 1 END) as bookmarks_with_colors
FROM browser_bookmarks
GROUP BY user_id
LIMIT 10;

-- Expected: Shows distribution of GOLD metrics in bookmarks

-- ==============================================================================
-- QUERY 4: CRITICAL - Check for raw URLs with query parameters (HARD FAIL)
-- ==============================================================================
SELECT
  user_id,
  url,
  CASE
    WHEN url LIKE '%?%' THEN '⚠️  CONTAINS ? (query params)'
    WHEN url LIKE '%#%' THEN '⚠️  CONTAINS # (hash)'
    WHEN url LIKE '%token%' OR url LIKE '%session%' OR url LIKE '%auth%' THEN '⚠️  SENSITIVE PARAM NAME'
    ELSE '✓ CLEAN'
  END as url_safety
FROM browser_bookmarks
WHERE url LIKE '%?%' OR url LIKE '%#%'
LIMIT 20;

-- Expected: 0 rows (all URLs should be canonical without params)
-- If > 0: HARD FAIL - sensitive data persisted

-- ==============================================================================
-- QUERY 5: Check for duplicate bookmarks (idempotency test)
-- ==============================================================================
SELECT
  user_id,
  url,
  COUNT(*) as duplicate_count,
  MAX(updated_at) as last_update,
  MIN(created_at) as first_created
FROM browser_bookmarks
GROUP BY user_id, url
HAVING COUNT(*) > 1;

-- Expected: 0 rows (unique constraint should prevent duplicates)
-- If > 0: Idempotency issue

-- ==============================================================================
-- QUERY 6: Verify GDPR soft-delete flag behavior (if implemented)
-- ==============================================================================
SELECT
  table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN is_deleted = true THEN 1 END) as soft_deleted_rows
FROM (
  SELECT 'browser_bookmarks' as table_name, is_deleted FROM browser_bookmarks
  UNION ALL
  SELECT 'browser_history' as table_name, is_deleted FROM browser_history
) t
GROUP BY table_name;

-- Expected: Both tables have is_deleted column and some soft-deleted rows

-- ==============================================================================
-- QUERY 7: Verify user-scoped isolation (no data leakage between users)
-- ==============================================================================
SELECT
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_bookmarks,
  MIN(id) as sample_id,
  MAX(id) as last_id
FROM browser_bookmarks;

-- Verify:
-- - All user_ids are distinct UUIDs (not Auth0 subs)
-- - No cross-user pollution

-- ==============================================================================
-- QUERY 8: Check session_id tracking (GOLD #3)
-- ==============================================================================
SELECT
  user_id,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_history_entries,
  AVG(dwell_time_seconds) as avg_dwell_time_sec,
  AVG(scroll_depth_percent) as avg_scroll_depth_pct
FROM browser_history
WHERE session_id IS NOT NULL
GROUP BY user_id
LIMIT 10;

-- Expected: Shows session context tracking works

-- ==============================================================================
-- QUERY 9: Check for dwell_time and scroll_depth values (GOLD #1, #9)
-- ==============================================================================
SELECT
  COUNT(*) as total_history_rows,
  COUNT(CASE WHEN dwell_time_seconds IS NOT NULL THEN 1 END) as rows_with_dwell_time,
  COUNT(CASE WHEN scroll_depth_percent IS NOT NULL THEN 1 END) as rows_with_scroll_depth,
  AVG(dwell_time_seconds) as avg_dwell_time,
  MAX(dwell_time_seconds) as max_dwell_time,
  AVG(scroll_depth_percent) as avg_scroll_depth,
  MAX(scroll_depth_percent) as max_scroll_depth
FROM browser_history;

-- Expected: Dwell time and scroll depth captured for majority of visits

-- ==============================================================================
-- QUERY 10: Check brand and category extraction (GOLD #2, #6)
-- ==============================================================================
SELECT
  user_id,
  COUNT(*) as total_bookmarks,
  COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as bookmarks_with_brand,
  COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as bookmarks_with_category,
  COUNT(DISTINCT brand) as unique_brands,
  COUNT(DISTINCT category) as unique_categories
FROM browser_bookmarks
WHERE brand IS NOT NULL OR category IS NOT NULL
GROUP BY user_id
LIMIT 10;

-- Expected: Brand and category extracted from titles/URLs

-- ==============================================================================
-- QUERY 11: CRITICAL - Check for price_history completeness (GOLD #4)
-- ==============================================================================
SELECT
  user_id,
  COUNT(*) as total_bookmarks,
  COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as bookmarks_with_current_price,
  COUNT(CASE WHEN price_history IS NOT NULL AND price_history::text != '[]' THEN 1 END) as bookmarks_with_price_history
FROM browser_bookmarks
GROUP BY user_id
LIMIT 10;

-- Expected: Shows price tracking coverage

-- ==============================================================================
-- QUERY 12: Check product interaction tracking (GOLD #5-10 combined)
-- ==============================================================================
SELECT
  COUNT(*) as total_interactions,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_scoped,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT product_url) as unique_products
FROM browser_product_interactions;

-- Expected: Shows product interaction capture

-- ==============================================================================
-- QUERY 13: Check time-to-action events (GOLD #7 - time from page load to action)
-- ==============================================================================
SELECT
  COUNT(*) as total_time_to_action_events,
  COUNT(DISTINCT user_id) as users_with_actions,
  COUNT(DISTINCT session_id) as sessions_with_actions,
  COUNT(DISTINCT product_url) as products_with_actions,
  AVG(time_to_action_seconds) as avg_time_to_action_sec,
  MAX(time_to_action_seconds) as max_time_to_action_sec
FROM browser_time_to_action;

-- Expected: Shows time-to-action metric capture

-- ==============================================================================
-- QUERY 14: CRITICAL - Check for duplicate GOLD metrics (idempotency test)
-- ==============================================================================
SELECT
  'browser_product_interactions' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT (user_id, product_url, timestamp)) as unique_interactions,
  COUNT(*) - COUNT(DISTINCT (user_id, product_url, timestamp)) as duplicates
FROM browser_product_interactions

UNION ALL

SELECT
  'browser_time_to_action' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT (user_id, product_url, time_to_action_seconds, occurred_at)) as unique_events,
  COUNT(*) - COUNT(DISTINCT (user_id, product_url, time_to_action_seconds, occurred_at)) as duplicates
FROM browser_time_to_action;

-- Expected: duplicates = 0 (or very low)
-- If high: Idempotency issue — HARD FAIL

-- ==============================================================================
-- QUERY 15: Check for emotion_at_save (GOLD #5 - emotional context)
-- ==============================================================================
SELECT
  COUNT(*) as total_bookmarks,
  COUNT(CASE WHEN emotion_at_save IS NOT NULL THEN 1 END) as bookmarks_with_emotion,
  COUNT(DISTINCT emotion_at_save) as unique_emotions,
  emotion_at_save,
  COUNT(*) as count
FROM browser_bookmarks
WHERE emotion_at_save IS NOT NULL
GROUP BY emotion_at_save
ORDER BY count DESC;

-- Expected: Shows emotion tracking if Mentalist integration enabled

-- ==============================================================================
-- QUERY 16: Check for body measurements (GOLD #8 - sensitive data)
-- ==============================================================================
SELECT
  COUNT(*) as total_rows_in_bookmarks,
  COUNT(CASE WHEN body_measurements_at_time IS NOT NULL THEN 1 END) as rows_with_measurements,
  COUNT(CASE WHEN body_measurements_at_time IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as percent_with_measurements
FROM browser_bookmarks;

-- Expected: Shows body measurement capture (sensitive data)
-- CAVEAT: Ensure these are treated as special category data and deleted on GDPR request

-- ==============================================================================
-- QUERY 17: Verify database constraints and indexes
-- ==============================================================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('browser_bookmarks', 'browser_history', 'browser_product_interactions', 'browser_time_to_action')
ORDER BY tablename, indexname;

-- Expected: Indexes on user_id, (user_id, url), session_id, product_url for efficient queries

-- ==============================================================================
-- QUERY 18: Check for Auth0 sub in database (HARD FAIL if found)
-- ==============================================================================
SELECT
  column_name,
  table_name,
  data_type
FROM information_schema.columns
WHERE column_name LIKE '%sub%' OR column_name LIKE '%auth0%'
  AND table_schema = 'public'
  AND table_name LIKE 'browser%';

-- Expected: 0 rows (Auth0 sub should NOT be in business logic tables)
-- If > 0: HARD FAIL — identity boundary violation

-- ==============================================================================
-- SUMMARY REPORT
-- ==============================================================================
-- Run this aggregate query to get overall GOLD metrics compliance status:

SELECT
  (SELECT COUNT(*) FROM browser_bookmarks) as bookmarks_count,
  (SELECT COUNT(*) FROM browser_history) as history_entries_count,
  (SELECT COUNT(*) FROM browser_product_interactions) as product_interactions_count,
  (SELECT COUNT(*) FROM browser_time_to_action) as time_to_action_events_count,
  (SELECT COUNT(*) FROM browser_bookmarks WHERE url LIKE '%?%' OR url LIKE '%#%') as WARN_urls_with_params,
  (SELECT COUNT(*) FROM browser_bookmarks b WHERE COUNT(*) > 1 OVER (PARTITION BY user_id, url)) as WARN_duplicate_bookmarks,
  (SELECT COUNT(DISTINCT user_id) FROM browser_bookmarks) as unique_users_bookmarks,
  (SELECT COUNT(DISTINCT user_id) FROM browser_history) as unique_users_history,
  (SELECT COUNT(DISTINCT user_id) FROM browser_product_interactions) as unique_users_interactions
AS compliance_report;

-- ==============================================================================
-- EXPECTED COMPLIANCE RESULTS
-- ==============================================================================
-- ✅ GOLD metrics tables exist and contain data
-- ✅ User scoping enforced (user_id present in all tables)
-- ✅ Auth0 sub not found in business logic tables
-- ❌ HARD FAIL if: URLs contain ? or #
-- ❌ HARD FAIL if: Duplicate GOLD metrics found
-- ❌ HARD FAIL if: Auth0 sub found in columns
-- ⚠️  WARN if: Body measurements not soft-deleted on user deletion
-- ⚠️  WARN if: Emotion data not classified as sensitive

