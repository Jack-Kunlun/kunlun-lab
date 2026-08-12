import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { ToolManifest } from "@kunlun/shared";
import {
  createToolRegistry,
  validateWorkToolLinks,
  type WorkToolLink,
} from "@kunlun/tool-kit/registry";

function extractFrontmatter(content: string): string | undefined {
  if (!content.startsWith("---\n")) {
    return undefined;
  }

  const closingDelimiterIndex = content.indexOf("\n---\n", 4);

  return closingDelimiterIndex === -1 ? undefined : content.slice(4, closingDelimiterIndex);
}

function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownFiles(entryPath);
      }

      return entry.isFile() && path.extname(entry.name).toLowerCase() === ".md" ? [entryPath] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRelativePath(rootDirectory: string, filePath: string): string {
  return path.relative(rootDirectory, filePath).replaceAll("\\", "/");
}

export function readWorkToolLinks(worksDirectory: string): WorkToolLink[] {
  return listMarkdownFiles(worksDirectory).map((filePath) => {
    const relativePath = normalizeRelativePath(worksDirectory, filePath);
    const frontmatterSource = extractFrontmatter(readFileSync(filePath, "utf8"));

    if (frontmatterSource === undefined) {
      throw new TypeError(`${relativePath}: 缺少 YAML frontmatter。`);
    }

    let frontmatter: unknown;

    try {
      frontmatter = parse(frontmatterSource);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new TypeError(`${relativePath}: YAML 解析失败：${message}`);
    }

    if (!isRecord(frontmatter)) {
      throw new TypeError(`${relativePath}: YAML frontmatter 必须是对象。`);
    }

    if (typeof frontmatter.title !== "string" || frontmatter.title.trim().length === 0) {
      throw new TypeError(`${relativePath}: title 必须是非空字符串。`);
    }

    if (frontmatter.toolId === undefined) {
      return { title: frontmatter.title };
    }

    if (typeof frontmatter.toolId !== "string" || frontmatter.toolId.trim().length === 0) {
      throw new TypeError(`${relativePath}: toolId 必须是非空字符串。`);
    }

    return { title: frontmatter.title, toolId: frontmatter.toolId };
  });
}

export function validateToolDirectory(
  worksDirectory: string,
  manifests: readonly ToolManifest[],
): void {
  const registry = createToolRegistry(manifests);
  const works = readWorkToolLinks(worksDirectory);

  validateWorkToolLinks(works, registry);
}
