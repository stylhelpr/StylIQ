#!/bin/bash
# Developer Helper: Scaffold local secrets directory
#
# This script creates empty placeholder files for all required secrets.
# You must fill in the actual values before the backend will start.
#
# Usage: bash scripts/setup-local-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

# Required secrets (must match main.ts REQUIRED_SECRETS)
REQUIRED_SECRETS=(
  "DATABASE_URL"
  "AUTH0_ISSUER"
  "AUTH0_AUDIENCE"
  "OPENAI_API_KEY"
  "PINECONE_API_KEY"
  "PINECONE_INDEX"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "GCP_SERVICE_ACCOUNT_JSON"
  "FIREBASE_SERVICE_ACCOUNT_JSON"
)

echo "============================================================"
echo "LOCAL SECRETS SETUP"
echo "============================================================"
echo ""

# Create secrets directory if missing
if [ ! -d "$SECRETS_DIR" ]; then
  echo "Creating secrets directory: $SECRETS_DIR"
  mkdir -p "$SECRETS_DIR"
else
  echo "Secrets directory exists: $SECRETS_DIR"
fi

echo ""
echo "Creating placeholder files for required secrets..."
echo ""

CREATED=0
EXISTING=0

for secret in "${REQUIRED_SECRETS[@]}"; do
  SECRET_FILE="$SECRETS_DIR/$secret"
  if [ ! -f "$SECRET_FILE" ]; then
    touch "$SECRET_FILE"
    echo "  [NEW] $secret"
    ((CREATED++))
  else
    echo "  [EXISTS] $secret"
    ((EXISTING++))
  fi
done

echo ""
echo "============================================================"
echo "SETUP COMPLETE"
echo "============================================================"
echo ""
echo "  Created: $CREATED new placeholder files"
echo "  Existing: $EXISTING files already present"
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Fill in each secret file with the actual value."
echo "     Each file should contain ONLY the secret value (no quotes, no newlines)."
echo ""
echo "  2. Secret file format examples:"
echo ""
echo "     DATABASE_URL:"
echo "       postgresql://user:pass@host:5432/dbname"
echo ""
echo "     AUTH0_ISSUER:"
echo "       https://your-tenant.auth0.com/"
echo ""
echo "     AUTH0_AUDIENCE:"
echo "       https://api.yourapp.com"
echo ""
echo "     OPENAI_API_KEY:"
echo "       sk-proj-..."
echo ""
echo "     PINECONE_API_KEY:"
echo "       pcsk_..."
echo ""
echo "     PINECONE_INDEX:"
echo "       your-index-name"
echo ""
echo "     UPSTASH_REDIS_REST_URL:"
echo "       https://...upstash.io"
echo ""
echo "     UPSTASH_REDIS_REST_TOKEN:"
echo "       AUod..."
echo ""
echo "     GCP_SERVICE_ACCOUNT_JSON:"
echo "       {\"type\":\"service_account\",\"project_id\":...}"
echo "       (Paste the FULL JSON content, not a file path)"
echo ""
echo "     FIREBASE_SERVICE_ACCOUNT_JSON:"
echo "       {\"type\":\"service_account\",\"project_id\":...}"
echo "       (Paste the FULL JSON content, not a file path)"
echo ""
echo "  3. The secrets/ directory is gitignored. NEVER commit secrets."
echo ""
echo "  4. Run 'npm run start:dev' to start the backend."
echo ""
