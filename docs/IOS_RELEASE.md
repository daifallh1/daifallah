# iOS release: unsigned IPA for third-party re-signing

The iPhone app (`apps/ios`, Expo SDK 52 / React Native 0.76.9, Hermes, New Architecture) is built as a **real native iOS application**: an Xcode Release archive for arm64 devices with the JavaScript bundle embedded. It is packaged as an **unsigned `.ipa`**. Your signing service applies its own certificate and provisioning profile when it re-signs the file. No Apple certificate, private key or provisioning profile is used, stored or requested by this project.

| Property | Value |
|---|---|
| App name | ITIL v5 Practice (executable `ITILv5Practice`) |
| Bundle identifier | `com.daifallah.itil5foundation` (re-signing services can usually override this) |
| Version / build | 1.0.0 / 1 |
| Minimum iOS | 15.1 |
| Architecture | arm64 (iPhone/iPad devices) |
| JS engine | Hermes bytecode embedded as `main.jsbundle`. No Metro or dev server needed |
| Offline | Question bank, Arabic overlay, explanations and audit data are compiled into `main.jsbundle`. Progress is stored on the device in AsyncStorage |
| Signing | None (`CODE_SIGNING_ALLOWED=NO`). `_CodeSignature` is removed before packaging |

## Option A: cloud build (GitHub Actions, macOS runner)

Workflow: `.github/workflows/ios-ipa.yml`. It runs on pushes to `claude/new-session-10ztde` that touch the app or shared packages, or manually (`workflow_dispatch`).

- **Job `ipa`** runs `npm ci`, the core tests and the iOS typecheck, then `apps/ios/scripts/build-ipa.sh`. That script does `expo prebuild` (which runs CocoaPods install), `xcodebuild archive` (Release, `generic/platform=iOS`, signing disabled), the verification checks, then packages `Payload/ITILv5Practice.app` into `ITILv5Practice-1.0.0-1-unsigned.ipa` with its `.sha256`, `build-info.json` and `verification.txt`.
  Artifact: **`ITILv5Practice-unsigned-ipa`**, kept for 30 days.
- **Job `simulator`** builds the same app in Release for the iOS Simulator, boots an iPhone simulator, installs and launches it, checks the process is still running after 30 s and that the log has no fatal JS or native errors, captures a screenshot, then runs the Maestro UI flow `apps/ios/maestro/exam-flow.yaml`. The flow checks: start exam, timer shows 1:00:00, Q 1/40, tapping option text shows Arabic without answering, the select zone answers, flag, navigator, submit confirmation, the result shows N / 40 with PASS/FAIL, and the wrong-answer review shows the source explanation.
  Artifact: **`simulator-smoke-evidence`**.

To download: open the run in GitHub → Actions → Artifacts. GitHub serves artifacts as `.zip`; unzip to get the `.ipa`. Check it against the published checksum with `shasum -a 256 *.ipa`.

## Option B: build on your own Mac

Requirements: macOS 14 or 15, Xcode 16.x (16.2 recommended for Expo SDK 52), Node 22, CocoaPods.

```bash
git clone https://github.com/daifallh1/daifallah && cd daifallah && git checkout claude/new-session-10ztde
npm ci
bash apps/ios/scripts/select-xcode.sh        # or: sudo xcode-select -s /Applications/Xcode_16.2.app
bash apps/ios/scripts/build-ipa.sh ./out     # → out/ITILv5Practice-1.0.0-1-unsigned.ipa (+ .sha256, verification.txt)
bash apps/ios/scripts/simulator-smoke.sh ./out-sim   # optional: Release simulator launch + Maestro flow
```

## Using the IPA with a re-signing service

1. Upload `ITILv5Practice-1.0.0-1-unsigned.ipa` to the service.
2. Let it sign the file with its own certificate and profile. Keep the bundle ID, or let the service rewrite it if its profile requires that.
3. Install on the iPhone. If iOS asks, trust the developer profile under Settings → General → VPN & Device Management.
4. The app needs no network access. Start a full exam: 40 questions, 60:00 timer, tap an option's text for Arabic, use the left-hand A/B/C/D zone to answer.

The app uses no entitlements (no push notifications, iCloud, app groups or keychain sharing), so any standard development or ad-hoc profile from the signing service should be enough.

## Limitations (see also docs/HANDOFF.md)

- Installation and use on a **physical iPhone was not tested** here: that requires your signing service and device.
- VoiceOver and Dynamic Type were not exercised on a real device.
- Build numbers do not auto-increment. Raise `expo.ios.buildNumber` in `apps/ios/app.json` for later builds if the signing service or device needs a newer build to update over an existing install.
- Arabic translations are AI-generated drafts and have not been reviewed by a human.
