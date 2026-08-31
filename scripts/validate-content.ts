import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateContentDirectory } from "./lib/content-validation.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveConfiguredContentRoots(): string[] {
  const configuredRoots = process.env.KUNLUN_CONTENT_VALIDATION_EXTRA_ROOTS?.trim();

  if (configuredRoots === undefined || configuredRoots === "") {
    return [];
  }

  const roots = configuredRoots.split(path.delimiter).map((root) => root.trim());

  if (roots.includes("")) {
    throw new Error(
      "KUNLUN_CONTENT_VALIDATION_EXTRA_ROOTS must contain only non-empty directory paths.",
    );
  }

  return roots.map((root) => (path.isAbsolute(root) ? root : path.resolve(repositoryRoot, root)));
}

function main(): void {
  const contentDirectory = path.join(repositoryRoot, "apps/web/content");
  const draftDirectory = path.join(repositoryRoot, "apps/web/content-drafts");
  const issues = [
    ...validateContentDirectory(contentDirectory),
    ...validateContentDirectory(draftDirectory, { allowDrafts: true }).map((issue) => ({
      ...issue,
      filePath: path.posix.join("content-drafts", issue.filePath),
    })),
    ...resolveConfiguredContentRoots().flatMap((extraRoot, index) =>
      validateContentDirectory(extraRoot).map((issue) => ({
        ...issue,
        filePath: path.posix.join(`extra-content-${String(index + 1)}`, issue.filePath),
      })),
    ),
  ];

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
