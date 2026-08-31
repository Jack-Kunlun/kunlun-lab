import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { articleSchema, pageSchema, workSchema } from "../../apps/web/content.schema.ts";

const collectionSchemas = {
  articles: articleSchema,
  pages: pageSchema,
  works: workSchema,
} as const;

type CollectionName = keyof typeof collectionSchemas;

export interface ContentValidationIssue {
  filePath: string;
  message: string;
}

export interface ContentValidationOptions {
  allowDrafts?: boolean;
}

interface ContentDirectoryEntries {
  markdownFiles: string[];
  symbolicLinks: string[];
}

const symbolicLinkMessage = "内容目录禁止符号链接；请使用真实文件或目录。";
const symbolicLinkRootMessage = "内容校验根目录禁止符号链接；请使用真实目录。";

function listMarkdownFiles(directory: string): ContentDirectoryEntries {
  const markdownFiles: string[] = [];
  const symbolicLinks: string[] = [];

  function visit(currentDirectory: string): void {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isSymbolicLink()) {
        symbolicLinks.push(entryPath);
        continue;
      }

      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
        markdownFiles.push(entryPath);
      }
    }
  }

  visit(directory);

  return { markdownFiles, symbolicLinks };
}

function extractFrontmatter(content: string): string | undefined {
  if (!content.startsWith("---\n")) {
    return undefined;
  }

  const closingDelimiterIndex = content.indexOf("\n---\n", 4);

  return closingDelimiterIndex === -1 ? undefined : content.slice(4, closingDelimiterIndex);
}

function normalizeRelativePath(rootDirectory: string, filePath: string): string {
  return path.relative(rootDirectory, filePath).replaceAll("\\", "/");
}

function isCollectionName(value: string): value is CollectionName {
  return Object.hasOwn(collectionSchemas, value);
}

function validateContentFile(
  contentDirectory: string,
  filePath: string,
  { allowDrafts = false }: ContentValidationOptions,
): ContentValidationIssue[] {
  const relativePath = normalizeRelativePath(contentDirectory, filePath);
  const [collectionName] = relativePath.split("/");

  if (collectionName === undefined || !isCollectionName(collectionName)) {
    return [];
  }

  const frontmatterSource = extractFrontmatter(readFileSync(filePath, "utf8"));

  if (frontmatterSource === undefined) {
    return [{ filePath: relativePath, message: "缺少 YAML frontmatter。" }];
  }

  try {
    const frontmatter: unknown = parse(frontmatterSource);
    const result = collectionSchemas[collectionName].safeParse(frontmatter);

    if (!result.success) {
      return result.error.issues.map(({ message }) => ({ filePath: relativePath, message }));
    }

    if (
      !allowDrafts &&
      collectionName === "articles" &&
      "draft" in result.data &&
      result.data.draft
    ) {
      return [
        {
          filePath: relativePath,
          message: "公开文章不能是草稿；请将草稿移至 apps/web/content-drafts/ 或测试夹具目录。",
        },
      ];
    }

    if (
      !allowDrafts &&
      collectionName === "works" &&
      "status" in result.data &&
      result.data.status === "draft"
    ) {
      return [
        {
          filePath: relativePath,
          message: "公开作品不能是 draft；请将草稿移至 apps/web/content-drafts/ 或测试夹具目录。",
        },
      ];
    }

    return [];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return [{ filePath: relativePath, message: `YAML 解析失败：${message}` }];
  }
}

export function validateContentDirectory(
  contentDirectory: string,
  options: ContentValidationOptions = {},
): ContentValidationIssue[] {
  const rootDirectory = path.resolve(contentDirectory);

  if (lstatSync(rootDirectory).isSymbolicLink()) {
    return [{ filePath: ".", message: symbolicLinkRootMessage }];
  }

  const { markdownFiles, symbolicLinks } = listMarkdownFiles(rootDirectory);
  const issues = [
    ...symbolicLinks.map((filePath) => ({
      filePath: normalizeRelativePath(rootDirectory, filePath),
      message: symbolicLinkMessage,
    })),
    ...markdownFiles.flatMap((filePath) => validateContentFile(rootDirectory, filePath, options)),
  ];

  return issues.sort(
    (left, right) =>
      left.filePath.localeCompare(right.filePath) || left.message.localeCompare(right.message),
  );
}
