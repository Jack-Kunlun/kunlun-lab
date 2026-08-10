const GENERATED_DIRECTORY_NAMES = new Set([
  ".nuxt",
  ".output",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const AUTHORED_JAVASCRIPT_EXTENSION = /\.(?:cjs|js|jsx|mjs)$/i;

function isGeneratedPath(path: string): boolean {
  return path
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => GENERATED_DIRECTORY_NAMES.has(segment));
}

function hasUtf8Bom(content: Uint8Array): boolean {
  return content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf;
}

export function inspectTextFile(path: string, content: Uint8Array): string[] {
  if (isGeneratedPath(path)) {
    return [];
  }

  const issues: string[] = [];

  if (AUTHORED_JAVASCRIPT_EXTENSION.test(path)) {
    issues.push(`${path}: authored JavaScript is not allowed`);
  }

  if (hasUtf8Bom(content)) {
    issues.push(`${path}: UTF-8 BOM is not allowed`);
  }

  if (content.includes(0x0d)) {
    issues.push(`${path}: CR or CRLF line endings are not allowed`);
  }

  if (content.length > 0 && content.at(-1) !== 0x0a) {
    issues.push(`${path}: final LF is required`);
  }

  return issues;
}
