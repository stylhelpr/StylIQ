#!/bin/bash

# Start Metro in background
npx react-native start &

# Wait a moment to ensure Metro is up
sleep 3

# Build and launch app
cd ios
xcodebuild \
  -workspace StylIQ.xcworkspace \
  -scheme StylIQ \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' \
  build

# Open the simulator if needed
open -a Simulator
