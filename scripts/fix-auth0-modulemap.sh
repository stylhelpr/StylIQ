#!/bin/bash
set -e

MODULE_DIR="$HOME/Library/Developer/Xcode/DerivedData"

# Try both Debug + Release builds
MAP_PATH=$(find "$MODULE_DIR" -type d \( -path "*/Debug-iphonesimulator/A0Auth0" -o -path "*/Release-iphonesimulator/A0Auth0" \) | head -n 1)

if [ -z "$MAP_PATH" ]; then
  echo "⚠️  A0Auth0 build folder not found yet. Run a build once, then re-run this script."
  exit 0
fi

MODULEMAP_FILE="$MAP_PATH/A0Auth0.modulemap"

if [ ! -f "$MODULEMAP_FILE" ]; then
  echo "🧩 Creating missing modulemap at: $MODULEMAP_FILE"
  cat > "$MODULEMAP_FILE" <<MAP
framework module A0Auth0 {
  umbrella header "A0Auth0-Swift.h"

  export *
  module * { export * }
}
MAP
else
  echo "✅ Modulemap already exists at: $MODULEMAP_FILE"
fi
