# iOS release: unsigned IPA for third-party re-signing

## Current build: 1.1.0 (build 5), 2026-11-27

| Item | Value |
|---|---|
| File | `ITILv5Practice-1.1.0-5-unsigned.ipa` (8,830,483 bytes) |
| **SHA-256** | **`94a370c4a8ed125984741564cb61dbcba7ee245ab14b75065021481041f0e4e1`** |
| Built by | GitHub Actions run #11 (`45925755185`), macOS 15, Xcode 16.4 (16F6) |
| Source commit | `4c46516800c1266d5976f7f7877953b861738c4d` |
| Bank | `1.1.0+216726579ec3324b` (271 approved questions, 256 distinct, six fixed exams) |
| Verification | `build-ipa.sh` **20/20 PASS** |
| Independent check | Info.plist `com.daifallah.itil5foundation` 1.1.0 (5), minimum iOS 15.1, unsigned. **271/271** approved questions have their stem, 4 options, an explanation and complete Arabic in `main.jsbundle`; the build-5 fixes are present in the bundle |
| Simulator (run #11) | Release build launched on an iPhone 17 Pro Simulator and stayed running. Maestro passed the exam, tap-to-translate, review, mistakes, study and Settings steps, and the native leave → Home step showed "Exam 2 · 1/43 answered" (answer kept). The next assertion looked for that text, but the card is one accessibility element labelled "Resume the exam in progress"; the flow now matches the card by id |

History of this release:
- Build 2 (`988321fc…e922`): tab headers sat under the status bar on notched iPhones, so the Settings gear could not be tapped.
- Build 3 (`e5d45b4e…9dd9`): fixed that.
- Build 4: Study "Not studied" fix and status-bar strip; superseded before delivery.
- Build 6 (in progress): shows "Version 1.1.0 (build N)" on Home and in Settings so the installed build can be identified; top safe-area fallback to the natively measured status-bar height; Study remembers category, filter and question across restarts. The owner's screen recording from an iPhone 17 Pro Max showed tab headers under the status bar exactly as in build 2, while build 5 renders correctly in the simulator, so the installed copy appeared to be an older build.
- Build 5: also fixes resume losing answers (found by a full QA pass), the "all mistakes fixed" message, level statistics without mistakes exams, the in-progress card bar and keyboard taps in Study.

Install the new IPA over the old app (same bundle identifier) to keep your saved progress. Use Settings › Export progress first for a backup file.


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

## Verified build (2026-11-22)

| Item | Value |
|---|---|
| File | `ITILv5Practice-1.0.0-1-unsigned.ipa` (4,638,803 bytes) |
| **SHA-256** | **`1511649bdf58b5af28cbffeeea8ffcd9b119f6dbafe766823548875036e844e1`** |
| Built by | GitHub Actions run #4 (`45069728972`), job "Build unsigned IPA", macOS 15 runner, **Xcode 16.4 (16F6), iphoneos18.5 SDK** |
| Source commit | `bc7d6c6637da3a5de2e48a377b63529e7110f847` |
| Artifact | `ITILv5Practice-unsigned-ipa` (id 14773591357; GitHub zip digest `sha256:35ae7deb…a5f5ad`), expires 2026-12-22 |
| Bank | `1.0.0+32721183c4e52e10` |

Verification by `build-ipa.sh` on the runner: **17/17 PASS**. That covers the bundle ID; the Hermes `main.jsbundle` and `hermes.framework` being embedded; an arm64 Mach-O; the question bank, Arabic, explanations and review UI being present in the bundle; quarantined Q195 excluded; assets bundled; no dev client; unsigned; minimum iOS 15.1; the IPA layout.

Independent re-inspection after downloading the artifact (Linux, Python):
- The checksum matches.
- Info.plist: `com.daifallah.itil5foundation`, 1.0.0 (1), minimum iOS 15.1, iPhone and iPad.
- No `_CodeSignature`, no `embedded.mobileprovision`.
- **276/276** exam-eligible questions have their verbatim stem and all 4 options in the shipped bundle.
- **266/266** source explanations are present.
- **276/276** have Arabic for the stem, all options and the explanation.

### Native Simulator evidence

Recorded on run #3 (commit `8677097`). That commit is functionally identical to the final build; run #4 only added a "Back" header label and two extra test steps. The same Release configuration was built for the iOS Simulator and run on an **iPhone 17 Pro Simulator** with no Metro or dev server:
- **Launch smoke test passed**: the app was still running after 30 s with no fatal JS or native errors in the device log.
- **Maestro native UI flow** passed: home screen, Exam tab, start exam, timer, Q 1/40, tap option text shows Arabic while "0 answered" stays unchanged, the select zone answers ("1 answered"), flag, next, navigator, submit confirmation ("39 question(s) unanswered."), result `N / 40` with PASS/FAIL, open the wrong-answer review.
- It stopped at the last assertion only because the explanation was below the fold. The flow now scrolls to it.
- The run #4 simulator job, which would have rerun the full flow, was **cancelled externally during compilation** and did not complete.

Screenshots: `docs/screenshots/ios-simulator/`.

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
