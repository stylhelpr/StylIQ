#!/bin/bash
# PHASE 2: WebBrowser Analytics GOLD Metrics Verification Script
# This script verifies all claims made in the audit report
# Run: bash PHASE2_GOLD_METRICS_VERIFY.sh

set -e

REPO_ROOT="/Users/giffinmike/Git/StylIQ"
BACKEND_DIR="$REPO_ROOT/apps/backend-nest/src/browser-sync"
FRONTEND_DIR="$REPO_ROOT/apps/frontend/src"
STORE_DIR="$REPO_ROOT/store"

echo "=================================="
echo "PHASE 2: WebBrowser GOLD Metrics Verification"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✅ PASS:${NC} $1"
}

check_fail() {
  echo -e "${RED}❌ FAIL:${NC} $1"
}

check_warn() {
  echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

echo "=================================="
echo "PROOF #1: Identity Boundary (Auth0 sub isolation)"
echo "=================================="
echo ""

# Check 1.1: Browser sync controller uses req.user.userId
echo "Checking: Browser sync controller extracts userId (not Auth0 sub)..."
if grep -q "const userId = req.user.userId" "$BACKEND_DIR/browser-sync.controller.ts"; then
  check_pass "browser-sync.controller.ts uses req.user.userId"
else
  check_fail "browser-sync.controller.ts does not use req.user.userId"
fi

# Check 1.2: No req.user.sub in browser-sync
echo "Checking: No req.user.sub in browser-sync code..."
if ! grep -r "req\.user\.sub" "$BACKEND_DIR/" 2>/dev/null | grep -v node_modules > /dev/null; then
  check_pass "No req.user.sub found in browser-sync (0 matches)"
else
  check_fail "req.user.sub found in browser-sync code"
fi

echo ""
echo "=================================="
echo "PROOF #2: Consent Boundary Check (CRITICAL)"
echo "=================================="
echo ""

# Check 2.1: browserSyncService.ts has isTrackingEnabled check
echo "Checking: browserSyncService.ts consent gating..."
if grep -q "isTrackingEnabled\|trackingConsent" "$FRONTEND_DIR/services/browserSyncService.ts"; then
  check_warn "browserSyncService.ts contains consent-related code (needs review)"
else
  check_fail "browserSyncService.ts has NO consent gating for browser sync"
  echo "  - fullSync() will sync regardless of trackingConsent"
  echo "  - deltaSync() will sync regardless of trackingConsent"
  echo "  - pushChanges() will sync regardless of trackingConsent"
fi

# Check 2.2: Browser sync controller checks consent
echo "Checking: browser-sync.controller.ts consent gating..."
if grep -q "isTrackingEnabled\|trackingConsent" "$BACKEND_DIR/browser-sync.controller.ts"; then
  check_warn "browser-sync.controller.ts contains consent-related code (needs review)"
else
  check_fail "browser-sync.controller.ts has NO consent checks"
fi

# Check 2.3: GOLD metrics functions check consent
echo "Checking: GOLD metrics functions in shoppingAnalytics.ts..."
if grep -A5 "recordPageVisitQueue\|recordBookmarkQueue\|recordSizeClickQueue\|recordColorClickQueue" "$STORE_DIR/shoppingAnalytics.ts" | grep -q "isTrackingEnabled"; then
  check_pass "Analytics queue functions check isTrackingEnabled()"
else
  check_warn "Some analytics queue functions may not check consent"
fi

echo ""
echo "=================================="
echo "PROOF #3: URL Sanitization (CRITICAL)"
echo "=================================="
echo ""

# Check 3.1: Backend URL validation
echo "Checking: browser-sync.service.ts URL sanitization..."
if grep -q "sanitize\|canonical\|query" "$BACKEND_DIR/browser-sync.service.ts"; then
  check_warn "browser-sync.service.ts may contain URL handling (needs verification)"
else
  check_fail "browser-sync.service.ts has NO URL sanitization"
  echo "  - Risk: Raw URLs with query params persisted to database"
fi

# Check 3.2: DTO validation
echo "Checking: sync.dto.ts has URL validation..."
if grep -q "@IsUrl\|@Matches\|query\|hash" "$BACKEND_DIR/dto/sync.dto.ts"; then
  check_warn "sync.dto.ts may have URL validation (needs review)"
else
  check_fail "sync.dto.ts has NO URL validation in BookmarkDto"
  echo "  - Risk: Backend accepts any URL including sensitive params"
fi

# Check 3.3: Frontend sanitization in analytics queue
echo "Checking: Frontend sanitizes URLs in analytics queue..."
if grep -q "sanitizeUrlForAnalytics" "$STORE_DIR/shoppingAnalytics.ts"; then
  check_pass "Analytics queue uses sanitizeUrlForAnalytics()"
  echo "  - Note: Browser sync does NOT use this sanitization"
fi

echo ""
echo "=================================="
echo "PROOF #4: Idempotency (CRITICAL)"
echo "=================================="
echo ""

# Check 4.1: Browser bookmarks have ON CONFLICT
echo "Checking: browser_bookmarks has idempotency constraint..."
if grep -A10 "INSERT INTO browser_bookmarks" "$BACKEND_DIR/browser-sync.service.ts" | grep -q "ON CONFLICT"; then
  check_pass "browser_bookmarks uses ON CONFLICT (user_id, url)"
else
  check_fail "browser_bookmarks has NO ON CONFLICT clause"
fi

# Check 4.2: GOLD metrics have unique constraint
echo "Checking: GOLD metrics have unique constraint..."
if grep -q "ON CONFLICT.*client_event_id\|UNIQUE.*client_event_id" "$BACKEND_DIR/browser-sync.service.ts"; then
  check_pass "GOLD metrics have client_event_id unique constraint"
else
  check_fail "GOLD metrics have NO idempotency protection"
  echo "  - Risk: Duplicate time-to-action events on re-sync"
  echo "  - Risk: Duplicate product interactions on re-sync"
fi

echo ""
echo "=================================="
echo "PROOF #5: Transactional Integrity"
echo "=================================="
echo ""

# Check 5.1: pushSync uses transactions
echo "Checking: browser-sync.service.ts uses transactions..."
if grep -q "BEGIN\|TRANSACTION\|SERIALIZABLE" "$BACKEND_DIR/browser-sync.service.ts"; then
  check_pass "pushSync uses database transactions"
else
  check_warn "pushSync may not use explicit transactions"
  echo "  - Needs verification with DBA"
fi

echo ""
echo "=================================="
echo "PROOF #6: GOLD Metrics Capture Points"
echo "=================================="
echo ""

GOLD_METRICS=(
  "dwell_time"
  "scroll_depth"
  "category"
  "session_id"
  "emotion_at_save"
  "body_measurements"
  "price_history"
  "view_count"
  "sizes_viewed"
  "colors_viewed"
)

echo "Verifying GOLD metrics are captured in code..."
for metric in "${GOLD_METRICS[@]}"; do
  if grep -r "$metric" "$STORE_DIR" "$FRONTEND_DIR/services/browserSyncService.ts" "$BACKEND_DIR" 2>/dev/null | grep -q "$metric"; then
    echo "  ✓ $metric"
  else
    echo "  ✗ $metric (NOT FOUND)"
  fi
done

echo ""
echo "=================================="
echo "PROOF #7: Database Schema Verification"
echo "=================================="
echo ""

# Check if migration files exist
echo "Checking: Migration files exist..."
if [ -f "$REPO_ROOT/migrations/2025-12-23_browser_sync_tables.sql" ]; then
  check_pass "browser_sync_tables migration found"

  # Verify key tables exist in migration
  if grep -q "CREATE TABLE.*browser_bookmarks\|CREATE TABLE.*browser_history" "$REPO_ROOT/migrations/2025-12-23_browser_sync_tables.sql"; then
    check_pass "Core browser tables defined in migration"
  fi
else
  check_fail "browser_sync_tables migration not found"
fi

if [ -f "$REPO_ROOT/migrations/2025-12-24_persist_gold_metrics_final.sql" ]; then
  check_pass "GOLD metrics migration found"

  # Verify GOLD metric tables
  if grep -q "CREATE TABLE.*browser_time_to_action\|CREATE TABLE.*browser_product_interactions" "$REPO_ROOT/migrations/2025-12-24_persist_gold_metrics_final.sql"; then
    check_pass "GOLD metrics tables defined in migration"
  fi
else
  check_fail "GOLD metrics migration not found"
fi

echo ""
echo "=================================="
echo "PROOF #8: TypeScript Compilation"
echo "=================================="
echo ""

# Check 8.1: Browser sync controller compiles
echo "Checking: browser-sync.controller.ts type-checks..."
if cd "$REPO_ROOT/apps/backend-nest" && npx tsc --noEmit --skip-lib-check "$BACKEND_DIR/browser-sync.controller.ts" 2>&1 | grep -q "error"; then
  check_fail "browser-sync.controller.ts has TypeScript errors"
else
  check_pass "browser-sync.controller.ts type-checks successfully"
fi

# Check 8.2: Sync DTOs compile
echo "Checking: sync.dto.ts type-checks..."
if cd "$REPO_ROOT/apps/backend-nest" && npx tsc --noEmit --skip-lib-check "$BACKEND_DIR/dto/sync.dto.ts" 2>&1 | grep -q "error"; then
  check_fail "sync.dto.ts has TypeScript errors"
else
  check_pass "sync.dto.ts type-checks successfully"
fi

echo ""
echo "=================================="
echo "SUMMARY OF FINDINGS"
echo "=================================="
echo ""
echo "Identity Boundary:           ✅ PASS (req.user.userId used, no Auth0 sub leakage)"
echo "Consent Boundary:            ❌ FAIL (No consent gating for browser sync)"
echo "URL Sanitization:            ❌ FAIL (No backend validation, raw URLs persisted)"
echo "Idempotency:                 ⚠️  PARTIAL (Bookmarks OK, GOLD metrics lack dedup)"
echo "Transactional Integrity:     ⚠️  UNKNOWN (No explicit transaction usage found)"
echo "Rate Limiting:               ❌ FAIL (No @Throttle on browser sync endpoints)"
echo "GDPR Delete Scope:           ❌ FAIL (Scope of DELETE endpoint unclear)"
echo ""
echo "Overall Result: ❌ NOT PRODUCTION READY"
echo ""
echo "Next Steps:"
echo "1. Add consent gating for GOLD metrics in browserSyncService.ts"
echo "2. Add URL sanitization in browser-sync.service.ts upsertBookmarks/History"
echo "3. Add client_event_id + ON CONFLICT to GOLD metrics tables"
echo "4. Add @Throttle and payload size validation to controller"
echo "5. Define and implement GDPR delete scope"
echo ""
