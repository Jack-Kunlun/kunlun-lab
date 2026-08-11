import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import approvedBaseConfig, { createBaseRulesConfig } from "@kunlun/eslint-config";

function assertUsesWorkspacePackageImport(configSource: string): void {
  assert.match(configSource, /\bfrom\s+["']@kunlun\/eslint-config["']/u);
  assert.doesNotMatch(
    configSource,
    /\bfrom\s+["'](?:\.{1,2}[\\/])*config[\\/]eslint(?:[\\/][^"']*)?["']/u,
    "root ESLint config must not import the legacy config/eslint path",
  );
  assert.doesNotMatch(
    configSource,
    /\bfrom\s+["'](?:\.{1,2}[\\/])*packages[\\/]eslint-config(?:[\\/][^"']*)?["']/u,
    "root ESLint config must not import the packages/eslint-config source path",
  );
}

void test("exports the approved base config through the workspace package", () => {
  const finalConfig = approvedBaseConfig.at(-1);

  assert.ok(finalConfig);
  assert.ok(finalConfig.rules);
  assert.ok("no-console" in finalConfig.rules);
  assert.ok("quotes" in finalConfig.rules);
  assert.equal(finalConfig.rules["no-console"], "error");
  assert.deepEqual(finalConfig.rules.quotes, ["error", "double"]);
});

void test("rewrites TypeScript plugin aliases and rule overrides", () => {
  const config = createBaseRulesConfig({
    files: ["**/*.ts"],
    pluginAliases: { "@typescript-eslint": "ts" },
    ruleOverrides: { "@typescript-eslint/no-explicit-any": "off" },
  });

  assert.deepEqual(config.files, ["**/*.ts"]);
  assert.ok(config.plugins?.ts);
  assert.equal(config.plugins["@typescript-eslint"], undefined);
  assert.equal(config.rules?.["ts/no-explicit-any"], "off");
});

void test("rejects legacy and relative source imports at the root config boundary", () => {
  const workspacePackageSpecifier = "@kunlun/eslint-config";
  const forbiddenImportSpecifiers = [
    "./config/eslint/base.ts",
    ".\\config\\eslint\\base.ts",
    "./packages/eslint-config/src/index.ts",
    ".\\packages\\eslint-config\\src\\index.ts",
  ];

  for (const specifier of forbiddenImportSpecifiers) {
    const configSource = [
      `import approvedConfig from "${workspacePackageSpecifier}";`,
      `import forbiddenConfig from "${specifier}";`,
    ].join("\n");

    assert.throws(() => {
      assertUsesWorkspacePackageImport(configSource);
    }, /must not import/u);
  }
});

void test("imports the root ESLint config through the workspace package boundary", async () => {
  const configSource = await readFile(new URL("../../eslint.config.ts", import.meta.url), "utf8");

  assertUsesWorkspacePackageImport(configSource);
});
