import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appBuildCommand = "pnpm";
const extraRootsVariable = "KUNLUN_CONTENT_VALIDATION_EXTRA_ROOTS";
const commandTimeoutMs = 180_000;
const commandMaxBuffer = 32 * 1024 * 1024;
const nuxtBuildMarker = /\$ nuxt build/u;

interface CommandResult {
  exitCode: number;
  output: string;
}

function runAppBuild(extraRoot: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      appBuildCommand,
      ["--filter", "@kunlun/web", "build"],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          [extraRootsVariable]: extraRoot,
        },
        maxBuffer: commandMaxBuffer,
        timeout: commandTimeoutMs,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error?.code === "ENOENT") {
          reject(new Error(`Unable to execute app build: ${error.message}`, { cause: error }));

          return;
        }

        let exitCode = 1;

        if (error === null) {
          exitCode = 0;
        } else if (typeof error.code === "number") {
          exitCode = error.code;
        }

        resolve({ exitCode, output: `${stdout}${stderr}` });
      },
    );
  });
}

function writeDraftFixtures(rootDirectory: string): void {
  const articlePath = path.join(rootDirectory, "articles", "draft.md");
  const workPath = path.join(rootDirectory, "works", "draft.md");

  mkdirSync(path.dirname(articlePath), { recursive: true });
  mkdirSync(path.dirname(workPath), { recursive: true });
  writeFileSync(
    articlePath,
    `---
publishedAt: 2026-08-10
updatedAt: 2026-08-10
tags:
  - 测试
featured: false
draft: true
---

# 仅用于 build gate 的文章草稿
`,
    "utf8",
  );
  writeFileSync(
    workPath,
    `---
title: 仅用于 build gate 的作品草稿
description: 仅用于验证 app build 会拒绝草稿。
type: project
status: draft
publishedAt: 2026-08-10
updatedAt: 2026-08-10
featured: false
---

# 仅用于 build gate 的作品草稿
`,
    "utf8",
  );
}

function writeSymlinkFixtures(rootDirectory: string, targetDirectory: string): void {
  const articleLink = path.join(rootDirectory, "articles/linked.md");
  const workLink = path.join(rootDirectory, "works/linked.md");
  const directoryLink = path.join(rootDirectory, "works/linked-directory");
  const brokenLink = path.join(rootDirectory, "pages/broken.md");

  mkdirSync(path.dirname(articleLink), { recursive: true });
  mkdirSync(path.dirname(workLink), { recursive: true });
  mkdirSync(path.dirname(brokenLink), { recursive: true });
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, "article-target.txt"), "article target\n", "utf8");
  writeFileSync(path.join(targetDirectory, "work-target.txt"), "work target\n", "utf8");
  writeFileSync(path.join(targetDirectory, "nested.md"), "# symlink target\n", "utf8");
  symlinkSync(path.join(targetDirectory, "article-target.txt"), articleLink);
  symlinkSync(path.join(targetDirectory, "work-target.txt"), workLink);
  symlinkSync(targetDirectory, directoryLink, "dir");
  symlinkSync(path.join(rootDirectory, "missing-target.md"), brokenLink);
}

void test(
  "app build rejects draft content from an additive public validation root before Nuxt starts",
  { timeout: commandTimeoutMs + 30_000 },
  async () => {
    const extraRoot = mkdtempSync(path.join(tmpdir(), "kunlun-public-content-build-"));

    try {
      writeDraftFixtures(extraRoot);

      const result = await runAppBuild(extraRoot);

      assert.notEqual(result.exitCode, 0, "app build should fail for public draft content");
      assert.match(result.output, /公开文章不能是草稿/u);
      assert.match(result.output, /公开作品不能是 draft/u);
      assert.match(result.output, /extra-content-1\/articles\/draft\.md/u);
      assert.match(result.output, /extra-content-1\/works\/draft\.md/u);
      assert.doesNotMatch(result.output, nuxtBuildMarker);
    } finally {
      assert.equal(existsSync(extraRoot), true);
      rmSync(extraRoot, { force: true, recursive: true });
    }
  },
);

void test(
  "app build rejects symlink content from an additive public validation root before Nuxt starts",
  { timeout: commandTimeoutMs + 30_000 },
  async () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "kunlun-public-content-symlink-build-"));
    const extraRoot = path.join(temporaryRoot, "public-content");
    const targetDirectory = path.join(temporaryRoot, "symlink-targets");

    mkdirSync(extraRoot);
    mkdirSync(targetDirectory);

    try {
      writeSymlinkFixtures(extraRoot, targetDirectory);

      const result = await runAppBuild(extraRoot);

      assert.notEqual(result.exitCode, 0, "app build should fail for symlink content");
      assert.match(result.output, /extra-content-1\/articles\/linked\.md/u);
      assert.match(result.output, /extra-content-1\/pages\/broken\.md/u);
      assert.match(result.output, /extra-content-1\/works\/linked-directory/u);
      assert.match(result.output, /extra-content-1\/works\/linked\.md/u);
      assert.equal((result.output.match(/内容目录禁止符号链接/gu) ?? []).length, 4);
      assert.doesNotMatch(result.output, nuxtBuildMarker);
    } finally {
      assert.equal(existsSync(temporaryRoot), true);
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  },
);
