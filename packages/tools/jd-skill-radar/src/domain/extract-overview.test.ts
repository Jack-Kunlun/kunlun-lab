import { describe, expect, it } from "vitest";
import type { AggregatedKeyword } from "./aggregate-keywords.ts";
import { extractOverview } from "./extract-overview.ts";

const createKeyword = (
  skillId: string,
  label: string,
  totalWeight: number,
  count: number,
): AggregatedKeyword => ({
  skillId,
  label,
  category: "framework",
  count,
  tone: "neutral",
  contexts: [],
  totalWeight,
});

describe("extractOverview", () => {
  it.each([
    ["岗位：高级前端开发工程师", "高级前端开发工程师"],
    ["招聘职位: Web 前端工程师", "Web 前端工程师"],
    ["\n产品说明\n高级前端开发工程师\n岗位职责", "高级前端开发工程师"],
    ["岗位职责：负责前端开发。", "未识别"],
  ])("extracts a conservative role from %s", (text, role) => {
    expect(extractOverview(text, []).role).toBe(role);
  });

  it.each([
    ["需要 3-5年开发经验", "3–5 年"],
    ["至少3年经验", "3 年以上"],
    ["5 年及以上经验", "5 年以上"],
    ["2~4 年优先，5 年以上亦可", "2–4 年"],
  ])("normalizes the earliest explicit experience in %s", (text, experience) => {
    expect(extractOverview(text, []).experience).toBe(experience);
  });

  it.each([
    ["学历要求：研究生", "硕士"],
    ["本科及以上学历", "本科"],
    ["大专学历", "大专"],
    ["学历不限", "学历不限"],
    ["具备良好的学习能力", "未识别"],
  ])("extracts only explicit education from %s", (text, education) => {
    expect(extractOverview(text, []).education).toBe(education);
  });

  it.each([
    ["工作地点：杭州\n支持混合办公", "杭州 / 混合办公"],
    ["城市: 上海", "上海"],
    ["支持远程办公", "远程办公"],
    ["负责杭州客户项目交付", "未识别"],
  ])("extracts only explicit location evidence from %s", (text, location) => {
    expect(extractOverview(text, []).location).toBe(location);
  });

  it("returns at most three explicitly matched frameworks without inference", () => {
    const keywords = [
      createKeyword("nextjs", "Next.js", 8, 2),
      createKeyword("vue", "Vue", 4, 1),
      createKeyword("angular", "Angular", 3, 1),
      createKeyword("react", "React", 1, 1),
    ];

    expect(extractOverview("职位：前端工程师", keywords).primaryFrameworks).toEqual([
      "Next.js",
      "Vue",
      "Angular",
    ]);
  });
});
