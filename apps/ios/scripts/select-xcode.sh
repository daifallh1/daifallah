#!/usr/bin/env bash
# Select an Xcode 16.x that is compatible with Expo SDK 52 / React Native 0.76 AND whose iOS SDK has a
# matching installed iOS Simulator runtime. ibtool needs that runtime to compile storyboards: without
# it, an archive fails with "iOS <ver> Platform Not Installed".
# Override with XCODE_APP=/Applications/Xcode_X.app.
set -euo pipefail
if [[ -n "${XCODE_APP:-}" ]]; then sudo xcode-select -s "$XCODE_APP"; xcodebuild -version; exit 0; fi

echo "Installed Xcodes:"; ls -d /Applications/Xcode*.app 2>/dev/null || true
RUNTIMES="$(xcrun simctl list runtimes 2>/dev/null | grep -E '^iOS [0-9]' || true)"
echo "Installed iOS simulator runtimes:"; echo "$RUNTIMES"

chosen=""
for v in 16.2 16.1 16.0 16.4 16.3; do
  app="/Applications/Xcode_$v.app"
  [[ -d "$app" ]] || continue
  sdk="$(DEVELOPER_DIR="$app/Contents/Developer" xcrun --sdk iphoneos --show-sdk-version 2>/dev/null || true)"
  echo "candidate $app: iphoneos SDK $sdk"
  if [[ -n "$sdk" ]] && echo "$RUNTIMES" | grep -qE "^iOS ${sdk//./\\.}( |\.)"; then chosen="$app"; break; fi
done
if [[ -z "$chosen" ]]; then
  echo "No Xcode 16.x with a matching simulator runtime; keeping the image default Xcode."
else
  sudo xcode-select -s "$chosen"
fi
xcodebuild -version
echo "Selected SDK: $(xcrun --sdk iphoneos --show-sdk-version)"
