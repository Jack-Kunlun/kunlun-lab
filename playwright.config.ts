import { defineConfig, devices } from "@playwright/test";

export const DEFAULT_E2E_PORT = 43117;

export function parseE2EPort(rawPort?: string): number {
  const value = rawPort ?? String(DEFAULT_E2E_PORT);

  if (!/^[1-9]\d{0,4}$/.test(value)) {
    throw new Error(
      `E2E_PORT must be a decimal integer from 1 through 65535; received "${value}".`,
    );
  }

  const port = Number(value);

  if (port < 1 || port > 65_535) {
    throw new Error(
      `E2E_PORT must be a decimal integer from 1 through 65535; received "${value}".`,
    );
  }

  return port;
}

export const E2E_PORT = parseE2EPort(process.env.E2E_PORT);
export const BASE_URL = `http://127.0.0.1:${String(E2E_PORT)}`;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  retries: process.env.CI === "true" ? 2 : 0,
  ...(process.env.CI === "true" ? { workers: 1 } : {}),
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  snapshotDir: "./tests/e2e/__screenshots__",
  snapshotPathTemplate:
    "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
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
    command: `pnpm --filter @kunlun/web dev --host 127.0.0.1 --port ${String(E2E_PORT)}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NUXT_TELEMETRY_DISABLED: "1",
    },
  },
});
