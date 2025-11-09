#!/bin/bash
# 🧩 StylIQ CocoaPods patch runner — clean, conflict-safe
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/ios"

bundle exec ruby - "$@" <<'RUBY'
  require 'rubygems'
  require 'bundler/setup'

  # Patch files live in ios/scripts
  root = File.expand_path('..', __dir__)
  ios_scripts = File.join(root, 'ios', 'scripts')

  # 🩹 Load patches **after** CocoaPods core but before the CLI runs
  require 'cocoapods'
  require File.join(ios_scripts, 'cocoapods_safe_aggregate_patch')
  require File.join(ios_scripts, 'cocoapods_installer_patch')

  # Now bring in the CLI
  require 'cocoapods/command'
  require 'claide/command'

  # Run the same entry point as `pod`
  Pod::Command.run(ARGV)
RUBY
