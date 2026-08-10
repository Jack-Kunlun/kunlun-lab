import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateVersionPolicy } from "./lib/version-policy.ts";

const workspaceDirectories = [
  "apps/web",
  "packages/shared",
  "packages/tool-kit",
  "packages/ui",
  "packages/tools/jd-skill-radar",
] as const;

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main(): Promise<void> {
  const rootDirectory = process.cwd();
  const nodeVersion = (await readFile(path.join(rootDirectory, ".node-version"), "utf8")).trim();
  const nvmrc = (await readFile(path.join(rootDirectory, ".nvmrc"), "utf8")).trim();
  const rootManifest = await readJson(path.join(rootDirectory, "package.json"));
  const workspaceManifests = await Promise.all(
    workspaceDirectories.map(async (directory) => ({
      manifest: await readJson(path.join(rootDirectory, directory, "package.json")),
      path: `${directory}/package.json`,
    })),
  );
  const issues = validateVersionPolicy({
    nodeVersion,
    nvmrc,
    rootManifest,
    workspaceManifests,
  });

  if (issues.length > 0) {
    process.stderr.write(`${issues.join("\n")}\n`);
    process.exitCode = 1;

    return;
  }

  process.stdout.write("Version policy passed.\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Version policy failed: ${message}\n`);
  process.exitCode = 1;
});
