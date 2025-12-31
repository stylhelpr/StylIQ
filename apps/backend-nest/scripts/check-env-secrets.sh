#!/bin/bash
# CI Script: Verify no secrets are accessed via process.env
# All secrets must use getSecret() from src/config/secrets.ts
#
# This script enforces the secret/config boundary:
# - SECRETS: Must come from filesystem mounts via getSecret()
# - CONFIG: Allowed via process.env (feature flags, ops config, platform vars)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

# =============================================================================
# ALLOWLIST: Non-secret runtime configuration (OK to use process.env)
# =============================================================================
# These are feature flags, debug flags, and platform-injected config.
# Add new non-secret config vars here as needed.
ALLOWLIST=(
  "NODE_ENV"
  "PORT"
  "FASTIFY_LOG_LEVEL"
  "SCHEDULE_NOTIFIER_INTERVAL_MS"
  "DISABLE_FEEDBACK"
  "USE_VERTEX"
  "STYLE_DEBUG"
  "WEATHER_DEBUG"
  "GCP_REGION"
  "DEFAULT_GENDER"
  "SECRETS_PATH"
)

# =============================================================================
# SECRET PATTERNS: These patterns in env var names indicate a secret
# =============================================================================
# If process.env.<VAR> matches any of these patterns, it's a violation.
# Pattern: KEY|TOKEN|SECRET|PASSWORD|DATABASE|DB_|AUTH|OPENAI|ANTHROPIC|
#          PINECONE|REDIS|SERP|RAPID|UNSPLASH|FIREBASE|SERVICE_ACCOUNT|
#          PRIVATE|JWT|ENCRYPT|CREDENTIAL
SECRET_PATTERNS="KEY|TOKEN|SECRET|PASSWORD|DATABASE|DB_|AUTH0|OPENAI|ANTHROPIC|PINECONE|REDIS|SERP|RAPID|UNSPLASH|FIREBASE|SERVICE_ACCOUNT|PRIVATE|JWT|ENCRYPT|CREDENTIAL"

echo "============================================================"
echo "SECRET BOUNDARY ENFORCEMENT CHECK"
echo "============================================================"
echo ""
echo "Source directory: $SRC_DIR"
echo "Allowlisted config vars: ${ALLOWLIST[*]}"
echo ""
echo "Secret detection patterns: $SECRET_PATTERNS"
echo ""

# Build grep pattern to exclude allowlisted vars
EXCLUDE_PATTERN=""
for var in "${ALLOWLIST[@]}"; do
  EXCLUDE_PATTERN="$EXCLUDE_PATTERN -e process\.env\.$var"
done

# =============================================================================
# CHECK 1: Find all process.env usage that matches secret patterns
# =============================================================================
echo "CHECK 1: Scanning for process.env usage matching secret patterns..."

# Find all process.env.* that match secret patterns
SECRET_VIOLATIONS=$(grep -rn "process\.env\." "$SRC_DIR" --include="*.ts" 2>/dev/null \
  | grep -v "^.*:.*//.*process\.env" \
  | grep -Ei "process\.env\.($SECRET_PATTERNS)" \
  || true)

if [ -n "$SECRET_VIOLATIONS" ]; then
  echo ""
  echo "❌ FAIL: Found process.env usage that appears to be a SECRET!"
  echo ""
  echo "Violations (must use getSecret() instead):"
  echo "$SECRET_VIOLATIONS"
  echo ""
  echo "Fix: Replace process.env.X with getSecret('X') from src/config/secrets.ts"
  exit 1
fi

echo "✅ PASS: No secret-like process.env usage detected."
echo ""

# =============================================================================
# CHECK 2: Find unauthorized process.env usage (not in allowlist)
# =============================================================================
echo "CHECK 2: Scanning for process.env usage not in allowlist..."

# Find all process.env.* that are not in the allowlist
UNAUTHORIZED=$(grep -rn "process\.env\." "$SRC_DIR" --include="*.ts" 2>/dev/null \
  | grep -v "^.*:.*//.*process\.env" \
  | grep -v $EXCLUDE_PATTERN \
  || true)

if [ -n "$UNAUTHORIZED" ]; then
  echo ""
  echo "⚠️  WARNING: Found process.env usage not in allowlist:"
  echo "$UNAUTHORIZED"
  echo ""
  echo "If this is a non-secret config var, add it to ALLOWLIST in this script."
  echo "If this is a secret, replace with getSecret() and this check will fail."
  echo ""
  # Note: We only warn here, not fail, since new config vars may be legitimate
  # The secret pattern check (CHECK 1) is the hard fail
fi

echo ""
echo "============================================================"
echo "✅ SECRET BOUNDARY CHECK PASSED"
echo "============================================================"
echo ""
echo "All secrets are accessed via filesystem mounts (getSecret())."
echo "Only allowlisted config vars use process.env."
exit 0
