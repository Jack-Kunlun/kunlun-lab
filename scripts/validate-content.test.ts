import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validationScript = path.join(repositoryRoot, "scripts/validate-content.ts");

interface CommandResult {
  exitCode: number;
  output: string;
}

function runValidation(
  cwd: string,
  extraEnvironment: NodeJS.ProcessEnv = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [validationScript],
      {
        cwd,
        env: { ...process.env, ...extraEnvironment },
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error?.code === "ENOENT") {
          reject(
            new Error(`Unable to execute content validator: ${error.message}`, { cause: error }),
          );

          return;
        }

        let exitCode = 1;

        if (error === null) {
          exitCode = 0;
        } else if (typeof error.code === "number") {
          exitCode = error.code;
        }

        resolve({
          exitCode,
          output: `${stdout}${stderr}`,
        });
      },
    );
  });
}

void test("resolves the repository from the script path when called from apps/web", async () => {
  const result = await runValidation(path.join(repositoryRoot, "apps/web"));

  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.output, /Content validation passed\./u);
});

void test("fails closed when an additive content root does not exist", async () => {
  const missingRoot = path.join(
    path.dirname(repositoryRoot),
    `kunlun-content-root-that-does-not-exist-${String(process.pid)}`,
  );

  assert.equal(existsSync(missingRoot), false);

  const result = await runValidation(repositoryRoot, {
    KUNLUN_CONTENT_VALIDATION_EXTRA_ROOTS: missingRoot,
  });

  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /Content validation failed/u);
  assert.match(result.output, /ENOENT/u);
});
