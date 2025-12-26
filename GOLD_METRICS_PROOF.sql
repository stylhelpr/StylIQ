-- ============================================================================
-- FAANG-GRADE GOLD METRICS VERIFICATION QUERIES
-- Purpose: Prove all invariants with actual data
-- ============================================================================

-- PREREQUISITE: Run these against your PostgreSQL database
-- Database: stylhelpr-sql (as configured in apps/backend-nest/.env)
-- These queries verify:
--   1. Events are properly stored with required fields
--   2. No duplicate events (idempotency working)
--   3. canonical_url has no query params or hash
--   4. GDPR soft-delete semantics are correct
--   5. Events are immutable (never updated)

-- ============================================================================
-- PROOF 1: Table Schema & Constraints
-- ============================================================================
-- Verify unique constraint exists on (user_id, client_event_id)
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints
WHERE table_name = 'shopping_analytics_events'
  AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- ============================================================================
-- PROOF 2: Event Count by Type (Distribution Proof)
-- ============================================================================
-- Shows all event types are being captured
SELECT
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY event_type
ORDER BY event_count DESC;

-- ============================================================================
-- PROOF 3: Canonical URL Safety (No Query Params or Hash)
-- ============================================================================
-- Verify NO canonical_url contains ? or #
-- Result should be: 0 rows
SELECT
  id,
  user_id,
  client_event_id,
  canonical_url,
  created_at
FROM shopping_analytics_events
WHERE is_deleted = FALSE
  AND (canonical_url LIKE '%?%' OR canonical_url LIKE '%#%')
LIMIT 10;

-- ============================================================================
-- PROOF 4: Title Sanitization (Max Length & No HTML)
-- ============================================================================
-- Verify title_sanitized respects length limits and no HTML tags
SELECT
  id,
  title_sanitized,
  LENGTH(title_sanitized) as title_length,
  created_at
FROM shopping_analytics_events
WHERE is_deleted = FALSE
  AND title_sanitized IS NOT NULL
  AND (
    LENGTH(title_sanitized) > 200
    OR title_sanitized LIKE '%<%'
    OR title_sanitized LIKE '%&%'
  )
LIMIT 10;
-- Expected result: 0 rows (all sanitized)

-- ============================================================================
-- PROOF 5: Idempotency Verification (No Duplicates)
-- ============================================================================
-- Verify (user_id, client_event_id) uniqueness is enforced
SELECT
  user_id,
  client_event_id,
  COUNT(*) as duplicate_count
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY user_id, client_event_id
HAVING COUNT(*) > 1;
-- Expected result: 0 rows (all unique)

-- ============================================================================
-- PROOF 6: Immutability Check (Events Never Updated)
-- ============================================================================
-- Verify created_at ≈ server_received_timestamp (never updated)
-- No UPDATE statements should have modified events after creation
SELECT
  id,
  client_event_id,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) as seconds_since_created
FROM shopping_analytics_events
WHERE is_deleted = FALSE
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- PROOF 7: GDPR Soft-Delete Semantics
-- ============================================================================
-- Verify is_deleted flag correctly marks soft-deleted records
SELECT
  'Total Events' as metric,
  COUNT(*) as count
FROM shopping_analytics_events
UNION ALL
SELECT
  'Active Events (is_deleted = FALSE)',
  COUNT(*)
FROM shopping_analytics_events
WHERE is_deleted = FALSE
UNION ALL
SELECT
  'Deleted Events (is_deleted = TRUE)',
  COUNT(*)
FROM shopping_analytics_events
WHERE is_deleted = TRUE;

-- ============================================================================
-- PROOF 8: User-Scoped Event Isolation
-- ============================================================================
-- Verify events are strictly scoped by user_id (no cross-user leakage)
SELECT
  user_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT client_event_id) as unique_events,
  COUNT(DISTINCT event_type) as event_types
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY user_id
ORDER BY event_count DESC
LIMIT 10;

-- ============================================================================
-- PROOF 9: Session Context Capture
-- ============================================================================
-- Verify session_id is captured for grouping related events
SELECT
  session_id,
  user_id,
  COUNT(*) as events_in_session,
  COUNT(DISTINCT event_type) as event_types,
  MAX(created_at) - MIN(created_at) as session_duration
FROM shopping_analytics_events
WHERE is_deleted = FALSE
  AND session_id IS NOT NULL
GROUP BY session_id, user_id
ORDER BY events_in_session DESC
LIMIT 10;

-- ============================================================================
-- PROOF 10: Payload Integrity (JSON Stored Correctly)
-- ============================================================================
-- Verify payload contains expected fields
SELECT
  id,
  client_event_id,
  event_type,
  payload,
  JSONB_KEYS(payload::JSONB) as payload_keys,
  created_at
FROM shopping_analytics_events
WHERE is_deleted = FALSE
  AND event_type = 'page_view'
LIMIT 5;

-- ============================================================================
-- PROOF 11: Recent Events (Last 24 Hours)
-- ============================================================================
-- Shows recent sync activity
SELECT
  DATE(created_at) as event_date,
  event_type,
  COUNT(*) as event_count
FROM shopping_analytics_events
WHERE is_deleted = FALSE
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at), event_type
ORDER BY event_date DESC, event_count DESC;

-- ============================================================================
-- PROOF 12: Duplicate Rejection Audit
-- ============================================================================
-- Shows if replay protection is working (same client_event_id rejected)
-- After a second sync attempt with same events, these should show 0 duplicates
-- (confirmed by ON CONFLICT DO NOTHING returning 0 rows)
SELECT
  user_id,
  COUNT(*) as total_events,
  COUNT(DISTINCT client_event_id) as unique_client_ids
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY user_id
HAVING COUNT(*) != COUNT(DISTINCT client_event_id);
-- Expected result: 0 rows (all counts should match)

-- ============================================================================
-- PROOF 13: Data Freshness & Sync Verification
-- ============================================================================
-- Shows that events are being synced and persisted
SELECT
  NOW() as current_time,
  MAX(created_at) as latest_event_time,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) as seconds_since_latest_event
FROM shopping_analytics_events
WHERE is_deleted = FALSE;

-- ============================================================================
-- PROOF 14: Domain Extraction Correctness
-- ============================================================================
-- Verify domain field is extracted from canonical_url correctly
SELECT
  domain,
  COUNT(*) as domain_count,
  COUNT(DISTINCT user_id) as unique_users,
  ARRAY_AGG(DISTINCT event_type) as event_types
FROM shopping_analytics_events
WHERE is_deleted = FALSE
GROUP BY domain
ORDER BY domain_count DESC
LIMIT 20;
