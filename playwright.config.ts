import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  retries: process.env.CI === "true" ? 2 : 0,
  ...(process.env.CI === "true" ? { workers: 1 } : {}),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  snapshotDir: "./tests/e2e/__screenshots__",
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    contextOptions: {
      reducedMotion: "reduce",
    },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "pnpm --filter @kunlun/web dev --host 127.0.0.1 --port 3000",
    url: BASE_URL,
    reuseExistingServer: process.env.CI !== "true",
    timeout: 180_000,
    env: {
      NUXT_TELEMETRY_DISABLED: "1",
    },
  },
});
