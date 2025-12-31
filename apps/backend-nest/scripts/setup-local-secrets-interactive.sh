#!/bin/bash
# Interactive Local Secrets Setup
#
# This script prompts for each required secret and writes them to the
# local secrets/ directory. For local development only.
#
# Usage: bash scripts/setup-local-secrets-interactive.sh
#
# Security:
# - Secrets are written to filesystem only (no env vars)
# - Input is masked where possible
# - Values are never echoed back
# - The secrets/ directory is gitignored

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

# Check for jq (required for JSON validation)
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for JSON validation."
  echo "Install with: brew install jq"
  exit 1
fi

echo "============================================================"
echo "INTERACTIVE LOCAL SECRETS SETUP"
echo "============================================================"
echo ""
echo "This script will prompt you for each required secret."
echo "Secrets are written to: $SECRETS_DIR"
echo "The secrets/ directory is gitignored - NEVER commit secrets."
echo ""

# Create secrets directory if missing
if [ ! -d "$SECRETS_DIR" ]; then
  echo "Creating secrets directory..."
  mkdir -p "$SECRETS_DIR"
fi

echo ""

# Function to read a secret (masked input)
read_secret() {
  local name="$1"
  local prompt="$2"
  local value=""

  echo "--- $name ---"
  echo "$prompt"
  echo -n "Enter value: "
  read -s value
  echo ""

  if [ -z "$value" ]; then
    echo "  [SKIPPED] No value provided"
    return 1
  fi

  echo -n "$value" > "$SECRETS_DIR/$name"
  echo "  [OK] Written to secrets/$name"
  return 0
}

# Function to read a JSON secret (multi-line, validated)
read_json_secret() {
  local name="$1"
  local prompt="$2"

  echo "--- $name ---"
  echo "$prompt"
  echo "Paste the FULL JSON content, then press Enter twice (empty line to finish):"
  echo ""

  local json=""
  local line=""
  local empty_count=0

  while true; do
    read -r line
    if [ -z "$line" ]; then
      ((empty_count++))
      if [ $empty_count -ge 1 ]; then
        break
      fi
    else
      empty_count=0
      if [ -n "$json" ]; then
        json="$json"$'\n'"$line"
      else
        json="$line"
      fi
    fi
  done

  if [ -z "$json" ]; then
    echo "  [SKIPPED] No JSON provided"
    return 1
  fi

  # Validate JSON with jq
  if ! echo "$json" | jq . > /dev/null 2>&1; then
    echo "  [ERROR] Invalid JSON - not written"
    return 1
  fi

  echo -n "$json" > "$SECRETS_DIR/$name"
  echo "  [OK] Valid JSON written to secrets/$name"
  return 0
}

# Track success/failure
SUCCESS=0
FAILED=0

echo "============================================================"
echo "STRING SECRETS"
echo "============================================================"
echo ""

# DATABASE_URL
if read_secret "DATABASE_URL" "PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# AUTH0_ISSUER
if read_secret "AUTH0_ISSUER" "Auth0 issuer URL (e.g., https://your-tenant.auth0.com/)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# AUTH0_AUDIENCE
if read_secret "AUTH0_AUDIENCE" "Auth0 API audience (e.g., https://api.yourapp.com)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# OPENAI_API_KEY
if read_secret "OPENAI_API_KEY" "OpenAI API key (starts with sk-proj-...)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# PINECONE_API_KEY
if read_secret "PINECONE_API_KEY" "Pinecone API key (starts with pcsk_...)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# PINECONE_INDEX
if read_secret "PINECONE_INDEX" "Pinecone index name"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# UPSTASH_REDIS_REST_URL
if read_secret "UPSTASH_REDIS_REST_URL" "Upstash Redis REST URL (https://...upstash.io)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# UPSTASH_REDIS_REST_TOKEN
if read_secret "UPSTASH_REDIS_REST_TOKEN" "Upstash Redis REST token"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

echo "============================================================"
echo "JSON SECRETS"
echo "============================================================"
echo ""

# GCP_SERVICE_ACCOUNT_JSON
if read_json_secret "GCP_SERVICE_ACCOUNT_JSON" "GCP Service Account JSON (full content from .json file)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

# FIREBASE_SERVICE_ACCOUNT_JSON
if read_json_secret "FIREBASE_SERVICE_ACCOUNT_JSON" "Firebase Service Account JSON (full content from .json file)"; then
  ((SUCCESS++))
else
  ((FAILED++))
fi
echo ""

echo "============================================================"
echo "SETUP COMPLETE"
echo "============================================================"
echo ""
echo "  Secrets written: $SUCCESS"
echo "  Skipped/failed:  $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "WARNING: Some secrets were not configured."
  echo "The backend will fail to start until all secrets are provided."
  echo ""
  echo "Re-run this script or manually populate the missing files in:"
  echo "  $SECRETS_DIR"
  echo ""
fi

if [ $SUCCESS -gt 0 ]; then
  echo "Local secrets populated. Restart the backend:"
  echo "  npm run start:dev"
  echo ""
fi
