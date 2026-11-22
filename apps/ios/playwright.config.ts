import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Exercises the Expo app's React Native UI rendered through react-native-web (NOT an iOS simulator).
const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4174", trace: "off" },
  webServer: { command: "node ../web/scripts/serve.mjs dist/web 4174", url: "http://localhost:4174", reuseExistingServer: true },
  projects: [{ name: "iphone-14", use: { ...devices["iPhone 14"], browserName: "chromium", launchOptions: { executablePath } } }],
});
