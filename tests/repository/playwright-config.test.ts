import assert from "node:assert/strict";
import test from "node:test";
import config, { BASE_URL, DEFAULT_E2E_PORT, parseE2EPort } from "../../playwright.config.ts";

function asRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);

  return value as Record<string, unknown>;
}

void test("Playwright uses one isolated port for baseURL and webServer", () => {
  const configRecord = asRecord(config);
  const use = asRecord(configRecord.use);
  const webServer = asRecord(configRecord.webServer);
  const selectedPort = parseE2EPort(process.env.E2E_PORT);
  const expectedBaseUrl = `http://127.0.0.1:${String(selectedPort)}`;

  assert.equal(DEFAULT_E2E_PORT, 43117);
  assert.equal(BASE_URL, expectedBaseUrl);
  assert.equal(use.baseURL, expectedBaseUrl);
  assert.equal(webServer.url, expectedBaseUrl);
  assert.equal(
    webServer.command,
    `pnpm --filter @kunlun/web dev --host 127.0.0.1 --port ${String(selectedPort)}`,
  );
  assert.equal(webServer.reuseExistingServer, false);
});

void test("Playwright rejects malformed or out-of-range E2E_PORT values", () => {
  for (const invalidPort of ["", "0", "65536", "43117x", "1;echo unsafe"]) {
    assert.throws(() => parseE2EPort(invalidPort), /E2E_PORT must be a decimal integer/);
  }
});
