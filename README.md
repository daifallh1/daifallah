# ITIL Foundation (Version 5) Exam Simulator — private practice system

Two clients that share one source-faithful, audited question bank:

| Client | Tech | Location |
|---|---|---|
| Responsive web app / installable PWA (iPhone, Android, tablets, Windows, macOS) | Next.js 14 (static export) + service worker + IndexedDB | `apps/web` |
| Native iPhone app | Expo SDK 52 / React Native 0.76 (Hermes), React Navigation, AsyncStorage | `apps/ios` |
| Shared core (schemas, blueprint exam generator, scoring, session/timer, review, mistakes-only practice, analytics, i18n, storage contract) | TypeScript + Zod + Vitest | `packages/core` |
| Audited content (bank, Arabic overlay, syllabus, audit reports) | Generated JSON | `packages/content` |
| Extraction / audit / translation pipeline | Python (pdfplumber, cross-checked with pdftotext) | `tools/` |

> Independent practice tool. Not affiliated with, endorsed by, or an official product of PeopleCert or AXELOS. ITIL® is a registered trademark of PeopleCert. Every practice question is reproduced verbatim from the owner-supplied PDF `ITIL Foundation 11-05-26.pdf` (SHA-256 `1d11798cd8d91fe100ed32690a95388a5cafe588b1aea495c76b4cbaaadce9bf`). No question, option or answer key was authored, rephrased or corrected.

## Source fidelity rules (enforced in code and tests)

- The PDF is the only source of stems, options and keys. The PeopleCert syllabus v5.0 (Feb 2026) is used **only** to classify questions and define the blueprint.
- Text is copied as pdfplumber reads it; the only normalisation is joining PDF line wraps, each logged in `occurrences.json → extractionAudit.joins`. A wrap at a hyphen keeps the hyphen (pdftotext silently deletes it — e.g. “file-sharing” → “filesharing” — so it is used only as a cross-check).
- Source typos (e.g. “eficiently”, “suficient”, “Oficial”, “dificult”) are kept verbatim and flagged as info.
- Stable IDs `itilf5-<sha12>-o<ordinal>`; the printed number is never a key (103 and 178 are reused).
- Duplicates are retained; an exclusion group prevents repeats within an attempt.
- Quarantined items (`needs_review`, `out_of_scope`, `incomplete`) are never served in Exam, Study or Mistakes modes.
- Arabic is an overlay linked by a hash of the exact English string; it never replaces or mutates English.

## Repository layout

```
apps/web/            Next.js PWA (app/, components/, lib/, e2e/ Playwright tests, scripts/ sw + static server)
apps/ios/            Expo app (src/screens, src/components, e2e/ react-native-web tests, app.json, eas.json)
packages/core/       Shared TypeScript logic + 336 Vitest tests (incl. 303 golden source-fidelity tests)
packages/content/
  syllabus/          Official v5.0 blueprint/criteria as data (classification reference only)
  source/pages.json  Per-line pdfplumber snapshot of the PDF with bounding boxes
  data/              occurrences.json (verbatim extraction) + classification.json (auditor metadata)
  translations/      ar/batches/*.ar.tsv (Arabic, keyed via manifests), ui.ar.json, glossary.ar.json
  build/             bank.json + translations.ar.json consumed by both apps
  reports/           import-audit.json/.md, extraction-log.json, translation-coverage.json
tools/extract/       extract_bank.py
tools/translate/     export_batches.py, compile_translations.py
tools/audit/         build_bank.py (audit + bank), side_by_side.py (local visual audit)
docs/                HANDOFF.md, screenshots/
source/              ITIL Foundation 11-05-26.pdf (owner-supplied; see HANDOFF.md re: repository visibility)
```

## Commands

```bash
npm install                         # Node 20+ (tested on Node 22.23), npm workspaces
pip install -r tools/requirements.txt   # only needed to regenerate content

# Content pipeline (deterministic; re-running produces byte-identical output)
npm run content:all                 # extract → compile translations → audit/build bank
python3 -I tools/audit/side_by_side.py   # local visual audit → packages/content/reports/pages/side-by-side.html

# Checks
npm run typecheck                   # core, web, ios
npm run lint
npm test                            # Vitest in packages/core

# Web
npm run dev -w @itil5/web           # http://localhost:3000
npm run build -w @itil5/web         # static export to apps/web/out + generates sw.js
npm run start -w @itil5/web         # serve out/ on http://localhost:4173
npm run e2e -w @itil5/web           # Playwright (needs a build)

# iOS (Expo)
npm run ios -w @itil5/ios           # requires macOS + Xcode Simulator (or Expo Go on a device)
npm run export:ios -w @itil5/ios    # compile the iOS Hermes bundle (works on Linux)
npm run export:web -w @itil5/ios && (cd apps/ios && npx playwright test --trace off)   # RN UI tests via react-native-web
npx eas build -p ios --profile preview   # needs an Expo account + Apple Developer credentials
```

Set `PW_CHROMIUM_PATH` if Playwright should use a preinstalled Chromium.

See [`docs/HANDOFF.md`](docs/HANDOFF.md) for verified results, the discrepancy log, translation coverage and blockers.
