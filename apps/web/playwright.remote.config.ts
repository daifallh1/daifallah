import { defineConfig, devices } from "@playwright/test";

/**
 * Tests a DEPLOYED (protected) Vercel URL on WebKit with iPhone emulation.
 *   REMOTE_URL=https://<deployment>.vercel.app VERCEL_BYPASS=<automation bypass secret> \
 *   npx playwright test -c playwright.remote.config.ts
 * The bypass secret is read from the environment only and is never committed.
 */
const bypass = process.env.VERCEL_BYPASS;
export default defineConfig({
  testDir: "./e2e-remote",
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.REMOTE_URL,
    trace: "off",
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : {},
  },
  projects: [{ name: "iphone-14-webkit", use: { ...devices["iPhone 14"], browserName: "webkit" } }],
});
