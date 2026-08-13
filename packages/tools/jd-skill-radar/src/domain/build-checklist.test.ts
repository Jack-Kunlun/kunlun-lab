import { describe, expect, it } from "vitest";
import type { AggregatedKeyword } from "./aggregate-keywords.ts";
import { buildChecklist } from "./build-checklist.ts";

const keyword = (overrides: Partial<AggregatedKeyword>): AggregatedKeyword => ({
  skillId: "typescript",
  label: "TypeScript",
  category: "language",
  count: 1,
  tone: "neutral",
  contexts: [],
  totalWeight: 1,
  ...overrides,
});

describe("buildChecklist", () => {
  it("builds stable TypeScript and Vue items without noteUrl", () => {
    const input = [
      keyword({ skillId: "vue", label: "Vue", category: "framework" }),
      keyword({ skillId: "typescript" }),
    ];

    const result = buildChecklist(input);

    expect(result).toEqual([
      { id: "prepare:typescript", label: "复习 TypeScript 核心知识" },
      { id: "prepare:vue", label: "准备 Vue 项目实践案例" },
    ]);
    expect(result.every((item) => !Object.hasOwn(item, "noteUrl"))).toBe(true);
    expect(input).toEqual([
      keyword({ skillId: "vue", label: "Vue", category: "framework" }),
      keyword({ skillId: "typescript" }),
    ]);
  });

  it("orders by tone, count, label, then skill ID", () => {
    const input = [
      keyword({ skillId: "vue", label: "Vue", tone: "preferred", count: 2 }),
      keyword({ skillId: "javascript", label: "JavaScript", tone: "required", count: 1 }),
      keyword({ skillId: "typescript", label: "TypeScript", tone: "required", count: 1 }),
      keyword({ skillId: "react", label: "React", tone: "preferred", count: 2 }),
    ];

    expect(buildChecklist(input).map(({ id }) => id)).toEqual([
      "prepare:javascript",
      "prepare:typescript",
      "prepare:react",
      "prepare:vue",
    ]);
  });
});
