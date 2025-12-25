#!/bin/bash
# CI tripwire: Fail build if Auth0 identifiers leak outside auth boundary

set -e

echo "Checking for Auth0 identifier leaks..."

# Check for req.user.sub usage (should NEVER exist)
if grep -R "req\.user\.sub" apps/backend-nest/src 2>/dev/null; then
  echo "❌ FAIL: req.user.sub found - Auth0 sub must not be accessed in controllers"
  exit 1
fi

# Check for auth0| literals in community module
if grep -R "auth0|" apps/backend-nest/src/community 2>/dev/null; then
  echo "❌ FAIL: auth0| literal found in community module"
  exit 1
fi

# Check for auth0_sub queries in community module
if grep -R "auth0_sub" apps/backend-nest/src/community 2>/dev/null; then
  echo "❌ FAIL: auth0_sub query found in community module"
  exit 1
fi

echo "✅ PASS: No Auth0 identifier leaks detected"
exit 0
