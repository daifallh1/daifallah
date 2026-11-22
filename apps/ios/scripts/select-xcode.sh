#!/usr/bin/env bash
# Select an Xcode 16.x compatible with Expo SDK 52 / React Native 0.76 (prefers 16.2, the release
# contemporary with SDK 52). Override with XCODE_APP=/Applications/Xcode_X.app.
set -euo pipefail
if [[ -n "${XCODE_APP:-}" ]]; then sudo xcode-select -s "$XCODE_APP"
else
  for v in 16.2 16.1 16.0 16.4 16.3; do
    if [[ -d "/Applications/Xcode_$v.app" ]]; then sudo xcode-select -s "/Applications/Xcode_$v.app"; break; fi
  done
fi
xcodebuild -version
