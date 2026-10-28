import { defineConfig, devices } from "@playwright/test";
import { ADMIN, BASE_URL, NOW, PORT, e2eDatabaseUrl } from "./e2e/env";

try {
  process.loadEnvFile(".env");
} catch {}

const db = e2eDatabaseUrl();

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "uk-UA",
    timezoneId: "Europe/Kyiv",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "Компʼютер", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: /mobile\.spec\.ts/ },
    { name: "iPhone", use: { ...devices["iPhone 15"] }, dependencies: ["setup"], testMatch: /(student|mobile)\.spec\.ts/ },
  ],
  webServer: {
    command: "node e2e/prepare.mjs && npx next build && npx next start -p " + PORT,
    url: `${BASE_URL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !!process.env.E2E_REUSE,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: db,
      DATABASE_URL_UNPOOLED: db,
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      E2E_NOW: NOW,
      NEXT_DIST_DIR: ".next-e2e",
      PUBLIC_URL: BASE_URL,
      TELEGRAM_BOT_TOKEN: "",
    },
  },
});
