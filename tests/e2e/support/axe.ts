import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import type { AxeResults } from "axe-core";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * 创建针对 WCAG A/AA 的 axe 扫描器。
 */
export function createAxeScanner(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS);
}

/**
 * 只保留 critical 与 serious 级别的违规，作为阻断门禁。
 */
export function blockingViolations(results: AxeResults): AxeResults["violations"] {
  return results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
}

/**
 * 将违规整理为可读文本，用于失败信息定位。
 */
export function describeViolations(results: AxeResults): string {
  return results.violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(" ")).join("; ");

      return `${violation.impact ?? "unknown"} [${violation.id}] ${violation.help} -> ${targets}`;
    })
    .join("\n");
}
