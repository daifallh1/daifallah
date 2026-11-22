import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Use a preinstalled Chromium when PW_CHROMIUM_PATH is set or the CI image provides one.
const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173", trace: "off" },
  webServer: { command: "node scripts/serve.mjs out 4173", url: "http://localhost:4173", reuseExistingServer: true, timeout: 30_000 },
  projects: [{ name: "chromium", use: { browserName: "chromium", launchOptions: { executablePath } } }],
});
