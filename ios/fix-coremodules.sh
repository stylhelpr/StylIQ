#!/bin/bash
set -e
PBXPROJ="ios/StylIQ.xcodeproj/project.pbxproj"

echo "🧩 Checking FRAMEWORK_SEARCH_PATHS..."
if ! grep -q "React/CoreModules" "$PBXPROJ"; then
  echo "🔧 Adding React/CoreModules search paths..."
  sed -i '' '/FRAMEWORK_SEARCH_PATHS = (/a\
ode_modules/react-native/React/CoreModules",\
ode_modules/react-native/React/Core",\
ode_modules/react-native/ReactCommon",\
' "$PBXPROJ"
else
  echo "✅ Already includes React/CoreModules paths."
fi

echo "✅ Done. Verify with: grep -A3 FRAMEWORK_SEARCH_PATHS ios/StylIQ.xcodeproj/project.pbxproj | head"
