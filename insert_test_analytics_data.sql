-- ========================================================================
-- TEST DATA INSERTION FOR ANALYTICS
-- Insert sample events for testing and verification
-- Date: 2025-12-26
-- ========================================================================

-- IMPORTANT: Replace 'REPLACE_WITH_USER_ID' with actual user UUID from your system
-- Get your user ID with: SELECT id FROM users LIMIT 1;

\echo 'Analytics Test Data Insertion'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Sample User ID (replace with actual)
\set user_id '11111111-1111-1111-1111-111111111111'

\echo 'Using user_id: :user_id'
\echo ''

-- Check if user exists
SELECT id, email FROM users WHERE id = :'user_id';

\echo ''
\echo 'Inserting test events...'
\echo ''

-- Insert test page_view events
INSERT INTO shopping_analytics_events (
  user_id,
  client_event_id,
  event_type,
  event_ts,
  canonical_url,
  domain,
  title_sanitized,
  session_id,
  payload,
  is_deleted
) VALUES
  -- Event 1: Product page view
  (
    :'user_id'::UUID,
    'aaaaaaaa-1111-1111-1111-111111111111'::UUID,
    'page_view',
    NOW() - INTERVAL '1 hour',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"dwell_time_sec": 45, "scroll_depth_pct": 65, "viewport_height": 800}',
    FALSE
  ),

  -- Event 2: Size click
  (
    :'user_id'::UUID,
    'bbbbbbbb-2222-2222-2222-222222222222'::UUID,
    'size_click',
    NOW() - INTERVAL '55 minutes',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"size_clicked": "M", "previous_size": null}',
    FALSE
  ),

  -- Event 3: Color click
  (
    :'user_id'::UUID,
    'cccccccc-3333-3333-3333-333333333333'::UUID,
    'color_click',
    NOW() - INTERVAL '50 minutes',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"color_clicked": "navy"}',
    FALSE
  ),

  -- Event 4: Bookmark
  (
    :'user_id'::UUID,
    'dddddddd-4444-4444-4444-444444444444'::UUID,
    'bookmark',
    NOW() - INTERVAL '45 minutes',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"category": "tops", "brand": "Gap", "price": 49.99}',
    FALSE
  ),

  -- Event 5: Cart add
  (
    :'user_id'::UUID,
    'eeeeeeee-5555-5555-5555-555555555555'::UUID,
    'cart_add',
    NOW() - INTERVAL '40 minutes',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"size": "M", "color": "navy", "quantity": 1, "price": 49.99}',
    FALSE
  ),

  -- Event 6: Different product view
  (
    :'user_id'::UUID,
    'ffffffff-6666-6666-6666-666666666666'::UUID,
    'page_view',
    NOW() - INTERVAL '30 minutes',
    'https://styliq.com/products/white-jeans',
    'styliq.com',
    'White Jeans - Size 32',
    'session-002',
    '{"dwell_time_sec": 120, "scroll_depth_pct": 85}',
    FALSE
  ),

  -- Event 7: Price check on jeans
  (
    :'user_id'::UUID,
    '11111111-7777-7777-7777-777777777777'::UUID,
    'price_check',
    NOW() - INTERVAL '25 minutes',
    'https://styliq.com/products/white-jeans',
    'styliq.com',
    'White Jeans - Size 32',
    'session-002',
    '{"price_shown": 79.99, "original_price": 99.99}',
    FALSE
  ),

  -- Event 8: Another page view (different domain)
  (
    :'user_id'::UUID,
    '22222222-8888-8888-8888-888888888888'::UUID,
    'page_view',
    NOW() - INTERVAL '15 minutes',
    'https://example.com/fashion/trends',
    'example.com',
    'Fashion Trends 2025',
    'session-003',
    '{"dwell_time_sec": 30, "scroll_depth_pct": 40}',
    FALSE
  ),

  -- Event 9: Duplicate event (should NOT insert - tests idempotency)
  (
    :'user_id'::UUID,
    'aaaaaaaa-1111-1111-1111-111111111111'::UUID,
    'page_view',
    NOW() - INTERVAL '1 hour',
    'https://styliq.com/products/blue-shirt',
    'styliq.com',
    'Blue Shirt - Size M',
    'session-001',
    '{"dwell_time_sec": 45, "scroll_depth_pct": 65, "viewport_height": 800}',
    FALSE
  )
ON CONFLICT (user_id, client_event_id) DO NOTHING;

\echo ''

-- Verify insertion
SELECT
  COUNT(*) as total_inserted,
  COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_count
FROM shopping_analytics_events
WHERE user_id = :'user_id'::UUID;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'View inserted events:'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
  event_type,
  COUNT(*) as count
FROM shopping_analytics_events
WHERE user_id = :'user_id'::UUID AND is_deleted = FALSE
GROUP BY event_type
ORDER BY count DESC;

\echo ''

SELECT
  id,
  event_type,
  canonical_url,
  event_ts,
  payload
FROM shopping_analytics_events
WHERE user_id = :'user_id'::UUID AND is_deleted = FALSE
ORDER BY received_ts DESC;

\echo ''
\echo '✅ Test data inserted successfully!'
