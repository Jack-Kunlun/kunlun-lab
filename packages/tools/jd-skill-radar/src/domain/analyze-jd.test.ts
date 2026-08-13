import { describe, expect, it } from "vitest";
import { analyzeJd } from "./analyze-jd.ts";
import { frontendVueJd } from "./fixtures/frontend-vue.ts";

describe("analyzeJd", () => {
  it.each([
    ["", "EMPTY"],
    ["Vue", "TOO_SHORT"],
    ["x".repeat(20_001), "TOO_LONG"],
    ["负责客户沟通、合同归档与行政支持。".repeat(8), "NO_SKILLS"],
  ] as const)("returns a non-throwing %s input result", (text, code) => {
    const result = analyzeJd(text);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe(code);

    if (code === "NO_SKILLS") {
      expect(result.error.message).toBe("没有识别到当前词典支持的前端技能。");
    }
  });

  it("builds one deterministic analysis from raw Task 7 matches", () => {
    const result = analyzeJd(frontendVueJd);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.overview).toMatchObject({
      role: "高级前端开发工程师",
      experience: "3–5 年",
      education: "本科",
      location: "杭州 / 混合办公",
    });
    expect(result.value.overview.primaryFrameworks[0]).toBe("Vue");
    expect(result.value.keywords.find(({ skillId }) => skillId === "typescript")).toMatchObject({
      count: 2,
      tone: "required",
    });
    expect(result.value.categories.find(({ category }) => category === "css")?.matchCount).toBe(3);
    expect(result.value.categories.every(({ score }) => score >= 1 && score <= 100)).toBe(true);
    expect(result.value.checklist.every(({ id }) => id.startsWith("prepare:"))).toBe(true);
    expect(result.value.meta).toEqual({
      characterCount: frontendVueJd.length,
      skillCount: result.value.keywords.length,
      categoryCount: result.value.categories.length,
    });
  });

  it("uses 未识别 and an empty framework list when evidence is absent", () => {
    const text = `${"TypeScript 与 Vite 工程实践。".repeat(6)}负责交付与团队沟通。`;
    const result = analyzeJd(text);

    expect(result.ok && result.value.overview).toEqual({
      role: "未识别",
      experience: "未识别",
      education: "未识别",
      location: "未识别",
      primaryFrameworks: [],
    });
  });
});
