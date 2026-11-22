#!/usr/bin/env bash
# Build the same app for the iOS Simulator (Release config, embedded bundle, no Metro), boot a
# simulator, install, launch, confirm the process stays alive, capture a screenshot and logs, and
# run the Maestro UI flow if Maestro is installed.  Usage: apps/ios/scripts/simulator-smoke.sh [out]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; APP_DIR="$(cd "$HERE/.." && pwd)"
OUT="${1:-$APP_DIR/build/sim-smoke}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
cd "$APP_DIR"; export CI=1
[[ -d ios ]] || npx expo prebuild --platform ios --clean
WS="$(ls -d ios/*.xcworkspace | head -1)"; SCHEME="$(basename "$WS" .xcworkspace)"
BID="com.daifallah.itil5foundation"
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$APP_DIR/build/sim-dd" CODE_SIGNING_ALLOWED=NO build \
  > "$OUT/xcodebuild-sim.log" 2>&1 || { tail -150 "$OUT/xcodebuild-sim.log"; exit 1; }
APP="$APP_DIR/build/sim-dd/Build/Products/Release-iphonesimulator/$SCHEME.app"
UDID="$(xcrun simctl list devices available -j | python3 -c '
import json,sys,re
d=json.load(sys.stdin)["devices"]
c=[(rt,x) for rt,v in d.items() if "iOS" in rt for x in v if x["name"].startswith("iPhone")]
c.sort(key=lambda t: [int(n) for n in re.findall(r"\d+", t[0])], reverse=True)
print(c[0][1]["udid"])')"
xcrun simctl list devices | grep "$UDID" | tee "$OUT/device.txt"
xcrun simctl boot "$UDID" || true; xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"
( xcrun simctl spawn "$UDID" log stream --style compact --predicate "process == \"$SCHEME\"" > "$OUT/app-log.txt" 2>&1 & echo $! > "$OUT/log.pid" )
LAUNCH="$(xcrun simctl launch "$UDID" "$BID")"; echo "$LAUNCH" | tee "$OUT/launch.txt"
PID="${LAUNCH##*: }"
sleep 30
xcrun simctl io "$UDID" screenshot "$OUT/01-launch.png"
ALIVE=no; kill -0 "$PID" 2>/dev/null && ALIVE=yes
echo "process $PID alive after 30s: $ALIVE" | tee -a "$OUT/result.txt"
kill "$(cat "$OUT/log.pid")" 2>/dev/null || true
if grep -E "Unhandled JS Exception|RCTFatal|Invariant Violation|\[fatal\]|Terminating app" "$OUT/app-log.txt" | tee "$OUT/fatal.txt" | grep -q .; then
  echo "FAIL fatal JS/native error in log" | tee -a "$OUT/result.txt"; exit 5; fi
[[ "$ALIVE" == yes ]] || { echo "FAIL app not running" | tee -a "$OUT/result.txt"; exit 6; }
echo "PASS app launched from embedded Release bundle and stayed running" | tee -a "$OUT/result.txt"
if command -v maestro >/dev/null 2>&1; then
  maestro --device "$UDID" test "$APP_DIR/maestro/exam-flow.yaml" --format junit --output "$OUT/maestro-junit.xml" --test-output-dir "$OUT/maestro" 2>&1 | tee "$OUT/maestro.log"
fi
(cd "$(dirname "$APP")" && ditto -c -k --keepParent "$SCHEME.app" "$OUT/$SCHEME-simulator.app.zip")
