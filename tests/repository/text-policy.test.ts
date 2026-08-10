import assert from "node:assert/strict";
import test from "node:test";
import { inspectTextFile } from "../../scripts/lib/text-policy.ts";

const encoder = new TextEncoder();

void test("accepts UTF-8 TypeScript with LF and a final newline", () => {
  assert.deepEqual(inspectTextFile("src/index.ts", encoder.encode("export {};\n")), []);
});

void test("rejects BOM, CRLF, missing final LF, and authored JavaScript", () => {
  assert.deepEqual(
    inspectTextFile("src/index.js", new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode("x\r\n")])),
    [
      "src/index.js: authored JavaScript is not allowed",
      "src/index.js: UTF-8 BOM is not allowed",
      "src/index.js: CR or CRLF line endings are not allowed",
    ],
  );
  assert.deepEqual(inspectTextFile("src/no-final-lf.ts", encoder.encode("export {};")), [
    "src/no-final-lf.ts: final LF is required",
  ]);
});

void test("ignores generated Nitro JavaScript output", () => {
  assert.deepEqual(
    inspectTextFile("apps/web/.output/server/index.mjs", encoder.encode("export {};\r\n")),
    [],
  );
});
