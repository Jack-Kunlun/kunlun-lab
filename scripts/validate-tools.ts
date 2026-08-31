import path from "node:path";
import { fileURLToPath } from "node:url";
import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { validateToolDirectory } from "./lib/tool-validation.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const worksDirectory = path.join(repositoryRoot, "apps/web/content/works");

  validateToolDirectory(worksDirectory, [jdSkillRadarManifest]);
  process.stdout.write("Tool validation passed.\n");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Tool validation failed: ${message}\n`);
  process.exitCode = 1;
}
