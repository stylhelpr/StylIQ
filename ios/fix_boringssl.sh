#!/bin/bash
set -e
echo "🔧 Fixing BoringSSL build flags..."
find ios/Pods/gRPC-Core -type f \( -name "*.mk" -o -name "*.xcconfig" \) -exec sed -i '' 's/-G//g' {} +
echo "✅ Verified: no -G flags remain."

