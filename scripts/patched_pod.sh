#!/bin/bash
# 🧩 StylIQ CocoaPods 1.15+ local wrapper (safe & isolated)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_FILE="${SCRIPT_DIR}/cocoapods_legacy_patch.rb"

# Inject our patch by setting RUBYOPT
export RUBYOPT="-r${PATCH_FILE}"

# Run CocoaPods through Bundler (scoped to this project)
bundle exec pod install
