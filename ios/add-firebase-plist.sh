#!/bin/bash
set -e
APP_NAME="StylIQ"
PLIST_PATH="/Users/giffinmike/Git/StylIQ-MEASUREMENT/GoogleService-Info.plist"
TARGET_DIR="./build/Debug-iphonesimulator/$APP_NAME.app"
echo "📦 Injecting $PLIST_PATH into $TARGET_DIR ..."
until [ -d "$TARGET_DIR" ]; do sleep 2; done
cp "$PLIST_PATH" "$TARGET_DIR/" && echo "✅ Copied GoogleService-Info.plist"
