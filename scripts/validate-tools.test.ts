import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { validateToolDirectory } from "./lib/tool-validation.ts";

let fixtureDirectory = "";

beforeEach(() => {
  fixtureDirectory = mkdtempSync(path.join(tmpdir(), "kunlun-tools-"));
  mkdirSync(path.join(fixtureDirectory, "works"), { recursive: true });
});

afterEach(() => {
  rmSync(fixtureDirectory, { force: true, recursive: true });
});

function writeWork(fileName: string, title: string, toolId?: string): void {
  const toolIdLine = toolId === undefined ? "" : `toolId: ${toolId}\n`;

  writeFileSync(
    path.join(fixtureDirectory, "works", fileName),
    `---\ntitle: ${title}\n${toolIdLine}---\n\n# ${title}\n`,
    "utf8",
  );
}

void test("accepts checked-in works whose internal tools are explicitly registered", () => {
  writeWork("radar.md", "前端岗位 JD 技能雷达", "jd-skill-radar");
  writeWork("external.md", "外部作品");

  assert.doesNotThrow(() => {
    validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]);
  });
});

void test("reports the work title and unknown tool ID", () => {
  writeWork("missing.md", "缺失工具作品", "missing");

  assert.throws(() => {
    validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]);
  }, /Unknown toolId "missing" in work "缺失工具作品"\./);
});

void test("rejects duplicate explicit manifests before validating works", () => {
  assert.throws(() => {
    validateToolDirectory(path.join(fixtureDirectory, "works"), [
      jdSkillRadarManifest,
      jdSkillRadarManifest,
    ]);
  }, /Duplicate tool id: jd-skill-radar/);
});

void test("reports malformed or missing work frontmatter", () => {
  writeFileSync(path.join(fixtureDirectory, "works", "broken.md"), "# 无 frontmatter\n", "utf8");

  assert.throws(() => {
    validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]);
  }, /broken\.md: 缺少 YAML frontmatter。/);
});
