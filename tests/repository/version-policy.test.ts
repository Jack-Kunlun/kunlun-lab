import assert from "node:assert/strict";
import test from "node:test";
import { validateVersionPolicy } from "../../scripts/lib/version-policy.ts";

void test("accepts exact external versions and workspace protocol dependencies", () => {
  const issues = validateVersionPolicy({
    nodeVersion: "24.19.0",
    nvmrc: "24.19.0",
    rootManifest: {
      packageManager: "pnpm@11.21.0",
      engines: { node: "24.x" },
      devDependencies: { turbo: "2.10.9" },
    },
    workspaceManifests: [
      {
        path: "apps/web/package.json",
        manifest: {
          dependencies: {
            "@kunlun/shared": "workspace:*",
            nuxt: "4.5.2",
          },
        },
      },
    ],
  });

  assert.deepEqual(issues, []);
});

void test("rejects ranges, prereleases, and Node version drift", () => {
  const issues = validateVersionPolicy({
    nodeVersion: "24.19.0",
    nvmrc: "24.18.1",
    rootManifest: {
      packageManager: "pnpm@11.21.0",
      engines: { node: "25.x" },
      devDependencies: {
        eslint: "^10.8.1",
        vitest: "4.2.0-beta.1",
      },
    },
    workspaceManifests: [],
  });

  assert.deepEqual(issues, [
    ".nvmrc must match .node-version (24.19.0)",
    "engines.node must be 24.x",
    "package.json devDependencies.eslint must use an exact stable version",
    "package.json devDependencies.vitest must use an exact stable version",
  ]);
});

void test("rejects a malformed Node version before deriving engines.node", () => {
  const issues = validateVersionPolicy({
    nodeVersion: "current",
    nvmrc: "current",
    rootManifest: {
      packageManager: "pnpm@11.21.0",
      engines: { node: "24.x" },
    },
    workspaceManifests: [],
  });

  assert.deepEqual(issues, [".node-version must contain an exact semantic version"]);
});
