import { describe, expect, it } from "vitest";
import { toMarkdown } from "./to-markdown.ts";
import type { JdAnalysis } from "./types.ts";

const analysis: JdAnalysis = {
  overview: {
    role: "高级前端开发工程师",
    experience: "3–5 年",
    education: "本科",
    location: "杭州 / 混合办公",
    primaryFrameworks: ["Vue"],
  },
  categories: [
    { category: "language", score: 100, matchCount: 2 },
    { category: "framework", score: 50, matchCount: 1 },
  ],
  keywords: [
    {
      skillId: "typescript",
      label: "TypeScript",
      category: "language",
      count: 2,
      tone: "required",
      contexts: ["敏感 JD 原文片段"],
    },
    {
      skillId: "vue",
      label: "Vue",
      category: "framework",
      count: 1,
      tone: "familiar",
      contexts: [],
    },
  ],
  checklist: [
    { id: "prepare:typescript", label: "复习 TypeScript 核心知识" },
    {
      id: "prepare:vue",
      label: "准备 Vue 项目实践案例",
      noteUrl: "https://www.kunlunmarket.work/vue",
    },
  ],
  meta: { characterCount: 240, skillCount: 2, categoryCount: 2 },
};

describe("toMarkdown", () => {
  it("serializes the approved sections in a deterministic order", () => {
    const markdown = toMarkdown(analysis, new Set(["prepare:typescript"]));

    expect(markdown).toBe(`# 前端岗位 JD 技能雷达

## 岗位概览
- 岗位：高级前端开发工程师
- 经验：3–5 年
- 学历：本科
- 地点或工作方式：杭州 / 混合办公
- 主要框架：Vue

## 技能分布
- 语言：100 / 100（2 次命中）
- 框架：50 / 100（1 次命中）

## 关键词明细
- TypeScript｜语言｜2 次｜必须
- Vue｜框架｜1 次｜熟悉

## 准备清单
- [x] 复习 TypeScript 核心知识
- [ ] [准备 Vue 项目实践案例](https://www.kunlunmarket.work/vue)

> 分值仅表示当前 JD 文本的强调程度，不代表岗位好坏、用户能力或面试结果。
`);
  });

  it("does not export JD context fragments", () => {
    const markdown = toMarkdown(analysis, new Set());

    expect(markdown).not.toContain("敏感 JD 原文片段");
    expect(markdown).not.toContain("contexts");
  });

  it("uses 未识别 and preserves safe markdown structure", () => {
    const special: JdAnalysis = {
      ...analysis,
      overview: {
        role: "未识别",
        experience: "未识别",
        education: "未识别",
        location: "未识别",
        primaryFrameworks: [],
      },
      checklist: [
        {
          id: "prepare:special",
          label: "复习 [特殊] *内容*",
          noteUrl: "https://example.com/a_(b)",
        },
      ],
    };

    const markdown = toMarkdown(special, new Set());

    expect(markdown).toContain("- 主要框架：未识别");
    expect(markdown).toContain("- [ ] [复习 \\[特殊\\] \\*内容\\*](https://example.com/a_%28b%29)");
    expect(toMarkdown(special, new Set())).toBe(markdown);
  });
});
