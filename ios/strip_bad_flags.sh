#!/bin/bash
set -e
echo "🧹 Stripping rogue '-G' flag from all BoringSSL-GRPC build settings..."

PBXPROJ="Pods/Pods.xcodeproj/project.pbxproj"

if grep -- '-G' "$PBXPROJ" >/dev/null; then
  cp "$PBXPROJ" "$PBXPROJ.bak"
  sed -i '' 's/-G //g' "$PBXPROJ"
  sed -i '' 's/ -G//g' "$PBXPROJ"
  echo "✅ Cleaned '-G' flags from Pods.xcodeproj"
else
  echo "✅ No '-G' flags found."
fi
