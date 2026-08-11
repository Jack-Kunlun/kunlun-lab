import assert from "node:assert/strict";
import test from "node:test";
import approvedBaseConfig, {
  createBaseRulesConfig,
} from "@kunlun/eslint-config";

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
