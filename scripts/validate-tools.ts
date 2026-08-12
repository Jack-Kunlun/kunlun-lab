import path from "node:path";
import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { validateToolDirectory } from "./lib/tool-validation.ts";

function main(): void {
  const worksDirectory = path.resolve(process.cwd(), "apps/web/content/works");

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
