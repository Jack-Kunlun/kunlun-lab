import path from "node:path";
import { validateContentDirectory } from "./lib/content-validation.ts";

function main(): void {
  const contentDirectory = path.resolve(process.cwd(), "apps/web/content");
  const issues = validateContentDirectory(contentDirectory);

  if (issues.length > 0) {
    const details = issues.map(({ filePath, message }) => `${filePath}: ${message}`).join("\n");

    process.stderr.write(`Content validation failed:\n${details}\n`);
    process.exitCode = 1;

    return;
  }

  process.stdout.write("Content validation passed.\n");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Content validation failed: ${message}\n`);
  process.exitCode = 1;
}
