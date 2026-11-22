# Web deployment (Vercel), protected preview

## Live URL (protected)

**https://itil5-foundation-practice-qycax5pss-data-gov1.vercel.app**

Opening it requires signing in to Vercel with the account that owns the "DataGov" team (Vercel Authentication). Anyone else, and any unauthenticated request including direct requests for the JavaScript files that contain the question bank, is redirected to Vercel's login page.

### Opening it on iPhone Safari
1. Open the URL above in **Safari**.
2. Vercel shows "Log in to Vercel": sign in with the same Vercel account (it has 2-factor authentication, so have your authenticator app ready).
3. You return to the app automatically. The login lasts for that browser session; repeat it if Safari asks again.

Use it in Safari itself. A Home Screen web app keeps its own cookies on iOS, so it may ask you to log in again and the protected service worker may not install there.

## Project configuration

| Setting | Value |
|---|---|
| Vercel team / project | DataGov (`team_0BW3848mOIwvve8JYWRYkgLN`) / `itil5-foundation-practice` (`prj_ViuOZKRKHsoF2CWr1xeXz3zBQE4C`), a new project. The existing `datagov-maturity` project was not touched |
| Git | `daifallh1/daifallah` (GitHub) |
| Root directory | `apps/web` (source files outside the root are included, for the npm workspaces) |
| Install command | `cd ../.. && npm ci --no-audit --no-fund` (installs the monorepo from its lockfile) |
| Build command | `npm run build` → `next build` (static export to `out/`) + `scripts/generate-sw.mjs` (service worker) |
| Framework / Node | Next.js / 22.x |
| Deployment protection | Vercel Authentication, `all_except_custom_domains`. No custom domains exist |
| Ignored Build Step | `if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi` (skips production builds) |

### Why production builds are disabled
`claude/new-session-10ztde` is the repository's **default branch**, so Vercel treats pushes to it as production. On the Hobby plan, Vercel Authentication cannot protect production domains (such as `itil5-foundation-practice.vercel.app`). To avoid ever publishing the question bank on a public URL:
- every production build is cancelled by the Ignored Build Step, so no production deployment or production domain exists (both production hostnames return `404 DEPLOYMENT_NOT_FOUND`);
- the app is served from a **preview** deployment, which Vercel Authentication protects.

Note: the GitHub repository itself is **public**, so the question bank in it can be read on GitHub regardless of the website's protection. Make the repository private on GitHub if that matters.

### Deploying a newer commit
Production builds are skipped, so a new protected preview is created through the Vercel API by deploying the commit SHA as the git ref (`gitSource: {type: "github", repoId: 464143194, ref: <sha>, sha: <sha>}`, no target). The deployment then gets its own `*.vercel.app` URL. Each deployment URL is permanent and keeps working.

## Verification (2026-11-22, deployment `dpl_DDzpH7TffhVhSdUNejTQXM4uybBX`, commit `c0471d9`)

- Build: READY in about 53 s (install from the repo root, `next build` static export, service worker generated).
- Protection: anonymous `GET` on `/`, `/exam/`, `/sw.js` and `/_next/static/chunks/*` gives `302` to `vercel.com/sso-api`. Both production hostnames give `404 DEPLOYMENT_NOT_FOUND`.
- Content integrity: the deployed JavaScript contains bank `1.0.0+32721183c4e52e10`:
  - 276/276 exam-eligible questions with verbatim stems and 4 options;
  - 266/266 source explanations;
  - 302/302 questionId → sourceAnswerKey pairs matching the committed bank;
  - 1,330/1,330 Arabic translations.
  Nothing was modified for deployment.
- iPhone Safari engine: `playwright.remote.config.ts` + `e2e-remote/iphone-safari.spec.ts` on **WebKit 18.2 with iPhone 14 emulation** (touch, Mobile Safari user agent, 390×844 at 3×) against the live deployment: **4/4 passed**.
  1. The app is served, not the login page, with no horizontal scroll.
  2. Exam: Question 1/40; timer 1:00:00; tapping option text shows RTL Arabic without selecting; tapping the select zone selects; flag; next; navigator; state kept after reload.
  3. A full attempt with 26 correct gives 26/40 PASS (65%), and the wrong-answer review has exactly 14 items, each with "Your answer", "Source key", the source explanation and its Arabic on tap.
  4. Fake clock moved past 60:00: the exam auto-submits and shows "Time is up" and Elapsed 1:00:00.
  Screenshots: `docs/screenshots/vercel-iphone-webkit/`.
- The tests used a temporary Vercel "protection bypass for automation" secret, sent only as a request header from the test machine. **It was revoked immediately after testing** (a request using it now gets a 302 to login).

### Not verified
- A physical iPhone. WebKit with iPhone emulation is the same engine as Safari but not real hardware.
- Signing in to Vercel on the phone (that is your step).
- Offline use of the installed PWA on iOS behind Vercel Authentication.
