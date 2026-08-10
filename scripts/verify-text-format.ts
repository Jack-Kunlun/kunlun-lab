import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { inspectTextFile } from "./lib/text-policy.ts";

const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
  ".woff",
  ".woff2",
]);

function listRepositoryFiles(rootDirectory: string): string[] {
  const safeDirectory = rootDirectory.replaceAll("\\", "/");
  const output = execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${safeDirectory}`,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ],
    { cwd: rootDirectory, encoding: "utf8" },
  );

  return output.split("\0").filter((filePath) => filePath.length > 0);
}

function isBinaryFile(filePath: string, content: Uint8Array): boolean {
  return binaryExtensions.has(path.extname(filePath).toLowerCase()) || content.includes(0x00);
}

function main(): void {
  const rootDirectory = process.cwd();
  const issues = listRepositoryFiles(rootDirectory).flatMap((filePath) => {
    const content = readFileSync(path.join(rootDirectory, filePath));

    return isBinaryFile(filePath, content) ? [] : inspectTextFile(filePath, content);
  });

  if (issues.length > 0) {
    process.stderr.write(`${issues.join("\n")}\n`);
    process.exitCode = 1;

    return;
  }

  process.stdout.write("Text policy passed.\n");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Text policy failed: ${message}\n`);
  process.exitCode = 1;
}
