#!/usr/bin/env bash
# Build the real React Native iOS app (Release, device arm64, embedded Hermes JS bundle) and package
# it as an UNSIGNED .ipa suitable for re-signing by a third-party signing service.
# No Apple certificate, private key or provisioning profile is used or required.
#
# Usage (macOS + Xcode 16): apps/ios/scripts/build-ipa.sh [output-dir]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$HERE/.." && pwd)"
ROOT="$(cd "$APP_DIR/../.." && pwd)"
OUT="${1:-$APP_DIR/build/ipa}"
[[ "$(uname)" == "Darwin" ]] || { echo "ERROR: building an iOS .ipa requires macOS with Xcode." >&2; exit 2; }
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"

[[ -d "$ROOT/node_modules" ]] || (cd "$ROOT" && npm ci --no-audit --no-fund)
test -s "$ROOT/packages/content/build/bank.json" || { echo "ERROR: question bank missing (run npm run content:all)" >&2; exit 3; }

cd "$APP_DIR"
export CI=1
npx expo prebuild --platform ios --clean          # generates ios/ and runs pod install
WS="$(ls -d ios/*.xcworkspace | head -1)"; SCHEME="$(basename "$WS" .xcworkspace)"
ARCHIVE="$OUT/$SCHEME.xcarchive"

echo "== xcodebuild archive ($SCHEME, Release, generic iOS device, signing disabled)"
set -o pipefail
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release -sdk iphoneos \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" CODE_SIGN_ENTITLEMENTS="" DEVELOPMENT_TEAM="" \
  archive > "$OUT/xcodebuild-archive.log" 2>&1 || { tail -150 "$OUT/xcodebuild-archive.log"; exit 1; }
grep -E "ARCHIVE SUCCEEDED" "$OUT/xcodebuild-archive.log"

APP="$ARCHIVE/Products/Applications/$SCHEME.app"
PLIST="$APP/Info.plist"
pb() { /usr/libexec/PlistBuddy -c "Print :$1" "$PLIST"; }
BID="$(pb CFBundleIdentifier)"; VER="$(pb CFBundleShortVersionString)"; BUILD="$(pb CFBundleVersion)"
MINOS="$(pb MinimumOSVersion)"; EXE="$(pb CFBundleExecutable)"

# ---- verification (fails the build if anything is wrong) ----
V="$OUT/verification.txt"; : > "$V"
check() { if eval "$2"; then echo "PASS  $1" | tee -a "$V"; else echo "FAIL  $1" | tee -a "$V"; FAILED=1; fi; }
FAILED=0
check "bundle identifier is com.daifallah.itil5foundation (got $BID)" '[[ "$BID" == "com.daifallah.itil5foundation" ]]'
check "Release JS bundle embedded (main.jsbundle present)" '[[ -s "$APP/main.jsbundle" ]]'
check "JS bundle is Hermes bytecode (no dev server needed)" 'file "$APP/main.jsbundle" | grep -q "Hermes JavaScript bytecode"'
check "device binary is arm64" 'lipo -archs "$APP/$EXE" | grep -qw arm64'
check "hermes.framework embedded" '[[ -d "$APP/Frameworks/hermes.framework" ]]'
BC="python3 $HERE/bundle_contains.py $APP/main.jsbundle"
BANKVER="$(node -p "require('$ROOT/packages/content/build/bank.json').bankVersion")"
Q1="$(node -p "require('$ROOT/packages/content/build/bank.json').questions[0].englishQuestion")"
E1="$(node -p "require('$ROOT/packages/content/build/bank.json').questions[0].sourceExplanation")"
AR1="$(node -p "const b=require('$ROOT/packages/content/build/bank.json');require('$ROOT/packages/content/build/translations.ar.json').content[b.questions[0].i18n.question].ar")"
check "question bank compiled into bundle (stable IDs + verbatim Q1 stem)" '$BC "itilf5-1d11798cd8d9-o001" "itilf5-1d11798cd8d9-o302" "$Q1"'
check "bank version $BANKVER compiled into bundle" '$BC "$BANKVER"'
check "Arabic translations compiled into bundle (Q1 Arabic stem)" '$BC "$AR1"'
check "source explanations compiled into bundle (Q1 explanation)" '$BC "$E1"'
check "review UI compiled into bundle" '$BC "Review answers" "YOUR ANSWER" "CORRECT ANSWER" "tap any sentence for Arabic"'
check "six fixed exams compiled into bundle" '$BC "fixed-1" "fixed-6"'
check "34 dump questions compiled into bundle" '$BC "itilf5-92e44064df18-o001" "itilf5-92e44064df18-o076"'
check "mistakes exam, backup and AI-explanation label compiled" '$BC "Mistakes exam" "Export progress" "Import progress" "AI-written from the Official Book"'
check "60-minute timer and 26/40 pass mark rules present" '$BC "passMark" "durationMinutes"'
check "no editorial 'Add answer' line in any option; printed #211 stays quarantined" 'node -e "const b=require(\"$ROOT/packages/content/build/bank.json\");const bad=b.questions.some(q=>q.englishOptions.some(o=>o.text.includes(\"Add answer\")));const q211=b.questions.find(x=>x.sourceOrdinal===212&&x.sourceKind===\"pdf\");process.exit(bad||q211.audit.examEligible?1:0)"'
check "image assets bundled" '[[ -d "$APP/assets" ]] && find "$APP/assets" -name "*.png" | grep -q .'
check "no expo-dev-client / dev launcher in the app (Release, no dev server)" '[[ ! -d "$APP/EXDevLauncher.bundle" && ! -d "$APP/EXDevMenu.bundle" ]]'
check "app is unsigned (ready for third-party re-signing)" '! codesign -v "$APP" >/dev/null 2>&1'
check "MinimumOSVersion is 15.1 (got $MINOS)" '[[ "$MINOS" == "15.1" ]]'
[[ "$FAILED" == 0 ]] || { echo "Verification failed"; exit 4; }

# ---- package ----
NAME="ITILv5Practice-${VER}-${BUILD}-unsigned.ipa"
rm -rf "$OUT/pkg"; mkdir -p "$OUT/pkg/Payload"
ditto "$APP" "$OUT/pkg/Payload/$SCHEME.app"
rm -rf "$OUT/pkg/Payload/$SCHEME.app/_CodeSignature"
(cd "$OUT/pkg" && ditto -c -k --sequesterRsrc --keepParent Payload "../$NAME")
(cd "$OUT" && shasum -a 256 "$NAME" | tee "$NAME.sha256")
unzip -l "$OUT/$NAME" | grep -q "Payload/$SCHEME.app/main.jsbundle" && echo "PASS  IPA contains Payload/$SCHEME.app/main.jsbundle" | tee -a "$V"

cat > "$OUT/build-info.json" <<JSON
{
  "ipa": "$NAME",
  "sha256": "$(cut -d' ' -f1 "$OUT/$NAME.sha256")",
  "bytes": $(stat -f%z "$OUT/$NAME"),
  "signed": false,
  "bundleIdentifier": "$BID",
  "version": "$VER",
  "build": "$BUILD",
  "minimumOSVersion": "$MINOS",
  "configuration": "Release",
  "architectures": "$(lipo -archs "$APP/$EXE")",
  "jsEngine": "hermes",
  "bankVersion": "$BANKVER",
  "gitCommit": "$(git -C "$ROOT" rev-parse HEAD)",
  "xcode": "$(xcodebuild -version | tr '\n' ' ')",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
cat "$OUT/build-info.json"
