import { readFileSync, readdirSync } from "node:fs";
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

function validateContentFile(contentDirectory: string, filePath: string): ContentValidationIssue[] {
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

    return result.success
      ? []
      : result.error.issues.map(({ message }) => ({ filePath: relativePath, message }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return [{ filePath: relativePath, message: `YAML 解析失败：${message}` }];
  }
}

export function validateContentDirectory(contentDirectory: string): ContentValidationIssue[] {
  return listMarkdownFiles(contentDirectory).flatMap((filePath) =>
    validateContentFile(contentDirectory, filePath),
  );
}
