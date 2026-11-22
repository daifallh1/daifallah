# Handoff report — ITIL Foundation (Version 5) Exam Simulator

Date: 2026-11-22. Everything below was run in a Linux cloud container (Node 22.23.5, Python 3, poppler 24.02, pdfplumber 0.11.10, Playwright 1.49.1 with Chromium).

## 1. Phase 1: PDF import audit (verified)

| Item | Result |
|---|---|
| Source | `ITIL Foundation 11-05-26.pdf`, 76 pages, SHA-256 `1d11798cd8d91fe100ed32690a95388a5cafe588b1aea495c76b4cbaaadce9bf` |
| Answer-key lines in PDF | **302**. Occurrences extracted: **302**, each with exactly 4 options A–D and an explicit key |
| Source explanations | 282 present, **20 missing** (Q32, 35, 37 on p8–9; Q119, 120 on p29; Q158–161 on p38; Q167–170, 172–177 on p40–41) |
| Question content pages | 1–71. Pages 72–75 are blank and page 76 shows only the stray number "41". This was caught and dropped after it was found leaking into Q302's explanation |
| Reused printed labels | 103 (two different questions, p25), 178 (two different questions, p41). Stable IDs are used throughout |
| Missing printed numbers | 171, 300 |
| Layout regimes | p1–41 have a `QUESTIONS` header and page-number footer (dropped and logged). Numbers appear as `1 )`, `1.`, `120 When…`, `133How…`, or alone on a line (`157`) |
| Cross-extractor check | pdfplumber and pdftotext agree character-for-character (ignoring whitespace and hyphens) on **all 76 pages** |
| Duplicates | 58 duplicate-stem groups covering 118 occurrences, 242 distinct normalised stems, and 236 exclusion groups after near-duplicate merging. The brief's preliminary figures (54 / 110 / 246) came from a different normalisation; my method is documented in `import-audit.json` |
| Status | **276 approved**, 12 needs_review, 14 out_of_scope, 0 incomplete. **276 exam-eligible** (approved, classified and fully translated) |
| Blueprint | Fully compliant 40-item exams (12/4/4/16/2/1/1, 16 BL1 / 24 BL2) **are achievable**. This was verified across 300 seeded generations in tests |

Machine-readable outputs: `packages/content/reports/import-audit.json`, `import-audit.md`, `extraction-log.json`, `translation-coverage.json`. Local visual audit: `python3 -I tools/audit/side_by_side.py` writes `packages/content/reports/pages/side-by-side.html`, which shows each occurrence's rendered PDF region next to its extracted text. It is gitignored because the page renders include the PDF's personal watermark.

### Thin-coverage caveats
- **Category 6 (ITIL and AI) has exactly one eligible question** (Q301, AI Capability Model), so it appears in every exam.
- Category 3 (lifecycle) has eligible items only at Bloom level 1, and category 2 only at level 2. The overall 16/24 split is still achieved.

## 2. Question-source discrepancy log (owner decisions required)

These are never served in practice. Nothing was corrected automatically.

| Page | Printed # | Status | Reason |
|---:|---:|---|---|
| 26 / 39 | 105 / 164 | needs_review | **Key conflict**: same stem and identical options, key **A** on p26 and key **C** on p39. The p26 explanation supports A ("fresh eyes") and the p39 explanation supports C |
| 44 | 190 | needs_review | Options B and C are both "Warranty" (confirmed on the rendered page) |
| 45 | 194 | needs_review | Option C reads "Product Vend" and appears truncated (confirmed on the rendered page) |
| 46 | 195 | needs_review | Editorial line "Add answer: D. The external partner providing technology." sits above option A. It is kept in `editorialArtifacts` and was not inserted |
| 49 | 211 | needs_review | Stem calls the ITIL VS a "series of steps" (value-stream wording). Possible accuracy dispute |
| 14, 29, 34 | 58, 120, 143 | needs_review | ITIL 4 terms in the stem or keyed option ("service value system", "dimension of service management") |
| 48, 49 | 206, 207 | needs_review | ITIL 4 Service Value System inputs/outcome model |
| 36 | 150 | needs_review | "Service relationship management": possible ITIL 4 concept, owner to confirm |
| 33, 40 | 139, 168 | out_of_scope | ITIL 4 value-chain activities (Engage, Obtain/build, Plan, Improve, Design and transition, Deliver and support) |
| 27, 30, 35 | 110, 125, 147 | out_of_scope | Definition of "change": no v5 assessment criterion |
| 36, 38, 40 | 149, 157–161, 169, 170, 172 | out_of_scope | ITIL 4 practice details (service configuration, information security, incident, problem, service desk, supplier management) |

Informational (still approved): source spellings preserved (20 occurrences); legacy ITIL 4 wording appearing only in a wrong option (Q91, Q122, Q202); Q286's explanation contains a stray "D. Incorrect…" sentence; some explanations in the p42–71 section refer to "ITIL 5" or list ITIL 4 practices. Explanations are shown exactly as supplied.

To approve an item after review, edit its entry in `packages/content/data/classification.json` (`statusOverride`, `criterion`) and run `npm run content:build`. The automated detectors for key conflicts, duplicate options and editorial artifacts still apply.

## 3. Translation coverage

- 1,330 unique English strings (all 302 occurrences) translated: **100%**. Approved items: questions 276/276, options 1,104/1,104, explanations 266/266. All 82 UI strings are translated, and a 98-term ITIL glossary is in `translations/glossary.ar.json`.
- Every translation is linked to the SHA-256 of the exact English string. Tests verify each link and confirm the English bank is never modified.
- **These translations are AI-generated drafts and have not been reviewed by a human** (`status: ai_draft_unreviewed`). The app says the English is authoritative. A bilingual ITIL reviewer should check them, especially the glossary terms.
- No network translation calls are made. Both apps bundle the overlay for offline use.
- **No supplementary AI explanations were generated.** Only source explanations are shown. Where the PDF has none, the app says so.

## 4. Test evidence (commands actually run)

| Command | Result |
|---|---|
| `npm run content:all` (run twice, then `diff -r`) | Identical output: the pipeline is deterministic |
| `npm run typecheck` (core, web, ios) | exit 0 |
| `npm run lint` (core ESLint, web `next lint --max-warnings 0`) | 0 errors, 0 warnings |
| `npm test` (Vitest, packages/core) | **336 / 336 passed**: 303 golden source-fidelity checks (every stem, option, key and explanation found in its PDF text region), audit counts and anomaly regression, blueprint over 300 seeds, no repeats within an attempt, timer and auto-submit, 26/40 pass vs 25/40 fail, persistence and resume, review only lists real misses, mistakes mode never adds new questions, translation completeness |
| `npm run build -w @itil5/web` | Static export, 9 routes, sw.js precaches 41 URLs |
| `npm run e2e -w @itil5/web` | **17 / 17 passed**: full exam flow (flag, edit, navigate, reload-resume, confirm submit), 26/40 PASS and review shows exactly 14 misses, 25/40 FAIL, timer auto-submit at 60:00 (fake clock), mistakes-only set comes only from missed items, desktop hover/click/keyboard translation without selecting, Arabic panel never covers the radio, mobile tap translation without selecting (repeated 3×), no horizontal scroll at 320/375/390/428/768/1024/1440 px, dark mode, offline load of the installed PWA, audit page |
| `npm run export:ios -w @itil5/ios` | iOS Hermes bytecode bundle compiled (2.86 MB, includes bank and Arabic) |
| `apps/ios`: `npx playwright test` (react-native-web render, iPhone 14 viewport, touch) | **2 / 2 passed**: tap-to-translate does not select, the radio zone selects, flag, navigator, confirm submit, results, review, persistence across reload, Study in dark mode |
| `npx expo install --check` | Dependencies match Expo SDK 52 (run in offline mode, which Expo marks as less reliable) |

Bugs found and fixed during testing: the stray page-76 number in Q302's explanation; a Study `<select>` that caused horizontal scroll on phones; on touch, the panel collapsing mid-tap so a radio tap could miss; hover-reveal firing from touch compatibility events; duplicate React Navigation copies breaking the RN app.

Screenshots captured from the running builds are in `docs/screenshots/web/` and `docs/screenshots/ios-rn-web/`. The `ios-rn-web` images show the Expo app's React Native UI rendered by react-native-web in Chromium on an iPhone 14 viewport. **They are not iOS Simulator or device screenshots.**

## 5. Accessibility and device notes

- Web: semantic fieldset/radiogroup, focus-visible outlines, skip link, keyboard toggle for translations (Enter/Space/Escape) plus an explicit "ع" button, `aria-expanded`, Arabic marked `lang="ar" dir="rtl"`, 44 px touch targets, safe-area insets, light/dark/auto themes, reduced-motion respected.
- iOS app: `accessibilityRole="radio"` with `aria-checked`, button hints for translation, Dynamic Type (RN default font scaling), safe-area-aware bottom bar, dark mode follows the system.
- Not yet verified: real VoiceOver or TalkBack sessions, physical devices, landscape on device, and an automated contrast audit tool (contrast was checked visually only).

## 6. Persistence and sync

- Web: IndexedDB, with localStorage as fallback. iOS: AsyncStorage instead of Expo SQLite. The data is small JSON and the shared `KeyValueBackend` keeps one implementation for both platforms.
- Attempts store a question snapshot and `bankVersion`, so history stays accurate after bank updates. Study marks (studied / still confusing / mastered) are append-only, so all history is kept.
- **Cross-device sync is not implemented.** No accounts, no backend, no credentials.

## 7. Outstanding blockers and limitations

1. **Native iOS build, Simulator run, TestFlight**: need macOS with Xcode, or EAS Build with an Expo account plus Apple Developer membership and signing credentials. None of these are available here. `app.json` uses a placeholder bundle id `com.example.itil5practice`, which must change before building. Nothing was deployed or submitted.
2. **Owner review** of the 26 non-approved items (section 2).
3. **Human review of the Arabic** translations.
4. **Repository visibility**: `daifallh1/daifallah` is public. Pushing the PDF, `pages.json`, the bank or translations publishes the verbatim question content (and the PDF's watermark). On 2026-11-22 the owner chose to push everything, including the source PDF, to the public repository. The local side-by-side page renders (21 MB) are still gitignored and are regenerated by `tools/audit/side_by_side.py`.
5. Syllabus classification (criterion, Bloom level) is the auditor's judgement, with per-item confidence and notes. It is analysis metadata only.
6. Web production deployment was not performed (no hosting was authorised). `apps/web/out` can be served from any static host over HTTPS so the service worker can install.
