import { describe, expect, it } from "vitest";
import { analyzeJd } from "./analyze-jd.ts";
import { frontendVueJd } from "./fixtures/frontend-vue.ts";
import { matchSkills } from "./match-skills.ts";
import { SKILLS } from "./skill-dictionary.ts";
import type { SkillCategory, SkillDefinition } from "./types.ts";

const skillById = (skillId: string): SkillDefinition => {
  const definition = SKILLS.find(({ id }) => id === skillId);

  if (definition === undefined) {
    throw new Error(`词典中缺少技能 "${skillId}"，回归基线预期它存在。`);
  }

  return definition;
};

const wrapRequirement = (fragment: string): string =>
  `岗位要求：熟练掌握 ${fragment} 相关开发经验，并能独立完成模块交付与团队协作沟通工作。`;

interface SkillDefinitionExpectation {
  id: string;
  label: string;
  category: SkillCategory;
  keyAlias: string;
}

const skillDefinitionExpectations: readonly SkillDefinitionExpectation[] = [
  { id: "javascript", label: "JavaScript", category: "language", keyAlias: "JS" },
  { id: "typescript", label: "TypeScript", category: "language", keyAlias: "TS" },
  { id: "vue", label: "Vue", category: "framework", keyAlias: "Vue 3" },
  { id: "vue-router", label: "Vue Router", category: "framework", keyAlias: "VueRouter" },
  { id: "pinia", label: "Pinia", category: "framework", keyAlias: "Pinia" },
  { id: "css", label: "CSS", category: "css", keyAlias: "CSS3" },
  { id: "vite", label: "Vite", category: "engineering", keyAlias: "Vite" },
  { id: "git", label: "Git", category: "collaboration", keyAlias: "Git" },
  { id: "code-review", label: "Code Review", category: "collaboration", keyAlias: "代码评审" },
];

describe("技能定义稳定性回归", () => {
  it.each(skillDefinitionExpectations)(
    "技能 $id 的 label、category 与关键 alias 与业务基线一致",
    ({ category, id, keyAlias, label }) => {
      const definition = skillById(id);

      expect(definition.label, `技能 ${id} 的 label 发生变化`).toBe(label);
      expect(definition.category, `技能 ${id} 的分类发生变化`).toBe(category);
      expect(definition.aliases, `技能 ${id} 缺少关键别名 ${keyAlias}`).toContain(keyAlias);
    },
  );
});

interface AliasExpectation {
  name: string;
  alias: string;
  skillId: string;
}

const aliasExpectations: readonly AliasExpectation[] = [
  { name: "TypeScript 缩写 TS 应匹配 typescript", alias: "TS", skillId: "typescript" },
  { name: "TypeScript 标准写法应匹配 typescript", alias: "TypeScript", skillId: "typescript" },
  { name: "JavaScript 缩写 JS 应匹配 javascript", alias: "JS", skillId: "javascript" },
  {
    name: "JavaScript 标准写法应匹配 javascript",
    alias: "JavaScript",
    skillId: "javascript",
  },
  { name: "Vue 3 写法应匹配 vue", alias: "Vue 3", skillId: "vue" },
  { name: "Vue3 紧凑写法应匹配 vue", alias: "Vue3", skillId: "vue" },
  { name: "Vue.js 写法应匹配 vue", alias: "Vue.js", skillId: "vue" },
  { name: "Vue Router 写法应匹配 vue-router", alias: "Vue Router", skillId: "vue-router" },
  { name: "VueRouter 紧凑写法应匹配 vue-router", alias: "VueRouter", skillId: "vue-router" },
  { name: "Node.js 写法应匹配 nodejs", alias: "Node.js", skillId: "nodejs" },
  { name: "NodeJS 紧凑写法应匹配 nodejs", alias: "NodeJS", skillId: "nodejs" },
  { name: "Code Review 写法应匹配 code-review", alias: "Code Review", skillId: "code-review" },
  { name: "代码评审 中文写法应匹配 code-review", alias: "代码评审", skillId: "code-review" },
  { name: "代码审查 中文写法应匹配 code-review", alias: "代码审查", skillId: "code-review" },
];

describe("别名与同义写法匹配回归", () => {
  it.each(aliasExpectations)("$name", ({ alias, skillId }) => {
    const matchedSkillIds = matchSkills(wrapRequirement(alias)).map((match) => match.skillId);

    expect(matchedSkillIds, `别名「${alias}」未匹配到技能 ${skillId}`).toContain(skillId);
  });
});

const unknownTerms = ["Fortran", "COBOL", "Delphi", "Haskell", "Erlang"] as const;
const unknownTermJd =
  "岗位职责：负责使用 TypeScript 交付业务模块。加分项：了解 Fortran、COBOL、Delphi、Haskell、Erlang 等冷门语言者优先，并具备良好的沟通能力。";

describe("未知技能词处理回归", () => {
  it("未知技能词不应生成关键词，也不会淹没已知技能", () => {
    const result = analyzeJd(unknownTermJd);

    expect(result.ok, "含未知词的 JD 分析不应失败").toBe(true);

    if (!result.ok) {
      return;
    }

    const matchedSkillIds = result.value.keywords.map((keyword) => keyword.skillId);

    expect(matchedSkillIds, "含未知词的 JD 应仍能识别 typescript").toContain("typescript");

    for (const term of unknownTerms) {
      expect(
        matchedSkillIds,
        `未知词「${term}」被错误识别为技能 ${matchedSkillIds.join("、")}`,
      ).not.toContain(term.toLocaleLowerCase("en-US"));
    }
  });

  it("未知技能词不会被 matchSkills 归入任何已知技能", () => {
    for (const term of unknownTerms) {
      const matchedSkillIds = matchSkills(wrapRequirement(term)).map((match) => match.skillId);

      expect(matchedSkillIds, `未知词「${term}」意外匹配到 ${matchedSkillIds.join("、")}`).toEqual(
        [],
      );
    }
  });

  it("纯非技术描述不会触发分析", () => {
    const result = analyzeJd("负责客户沟通、合同归档与行政支持。".repeat(8));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("NO_SKILLS");
  });
});

interface CategoryExpectation {
  name: string;
  skillId: string;
  category: SkillCategory;
}

const categoryExpectations: readonly CategoryExpectation[] = [
  { name: "TypeScript 应归类为 language", skillId: "typescript", category: "language" },
  { name: "Vue Router 应归类为 framework", skillId: "vue-router", category: "framework" },
  { name: "Sass 应归类为 css", skillId: "sass", category: "css" },
  { name: "Vite 应归类为 engineering", skillId: "vite", category: "engineering" },
  { name: "自动化测试 应归类为 engineering", skillId: "testing", category: "engineering" },
  { name: "Node.js 应归类为 nodejs", skillId: "nodejs", category: "nodejs" },
  { name: "Code Review 应归类为 collaboration", skillId: "code-review", category: "collaboration" },
];

describe("技能分类回归", () => {
  it.each(categoryExpectations)("$name", ({ category, skillId }) => {
    expect(skillById(skillId).category, `技能 ${skillId} 的分类发生变化`).toBe(category);
  });
});

const expectedFixtureSkillIds = [
  "code-review",
  "css",
  "git",
  "nodejs",
  "pinia",
  "sass",
  "tailwind-css",
  "testing",
  "typescript",
  "vite",
  "vue",
  "vue-router",
] as const;

const expectedFixtureCategories = [
  { category: "framework", score: 100, matchCount: 3 },
  { category: "language", score: 100, matchCount: 2 },
  { category: "css", score: 75, matchCount: 3 },
  { category: "engineering", score: 50, matchCount: 2 },
  { category: "collaboration", score: 50, matchCount: 2 },
  { category: "nodejs", score: 38, matchCount: 1 },
] as const;

describe("frontend-vue fixture 端到端回归", () => {
  it("识别出固定的关键技能集合且不产生未知 skillId", () => {
    const result = analyzeJd(frontendVueJd);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const matchedSkillIds = [...result.value.keywords.map((keyword) => keyword.skillId)].sort();

    expect(matchedSkillIds, "frontend-vue fixture 识别到的技能集合发生变化").toEqual([
      ...expectedFixtureSkillIds,
    ]);

    const knownSkillIds = new Set(SKILLS.map(({ id }) => id));

    for (const skillId of matchedSkillIds) {
      expect(knownSkillIds.has(skillId), `fixture 产生了未知 skillId ${skillId}`).toBe(true);
    }
  });

  it.each([
    { skillId: "typescript", count: 2, tone: "required" },
    { skillId: "vue", count: 1, tone: "required" },
    { skillId: "vue-router", count: 1, tone: "familiar" },
    { skillId: "pinia", count: 1, tone: "familiar" },
    { skillId: "nodejs", count: 1, tone: "preferred" },
  ] as const)("fixture 中技能 $skillId 的出现次数与语气与基线一致", ({ count, skillId, tone }) => {
    const result = analyzeJd(frontendVueJd);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const keyword = result.value.keywords.find((entry) => entry.skillId === skillId);

    expect(keyword, `fixture 未识别技能 ${skillId}`).toBeDefined();
    expect(keyword?.count, `技能 ${skillId} 的出现次数发生变化`).toBe(count);
    expect(keyword?.tone, `技能 ${skillId} 的语气发生变化`).toBe(tone);
  });

  it("分类得分、匹配数与排序与固定基线一致", () => {
    const result = analyzeJd(frontendVueJd);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(
      result.value.categories.map(({ category, matchCount, score }) => ({
        category,
        score,
        matchCount,
      })),
      "frontend-vue fixture 的分类得分或排序发生变化",
    ).toEqual([...expectedFixtureCategories]);

    const matchedCategories = new Set(result.value.keywords.map((keyword) => keyword.category));

    for (const { category } of result.value.categories) {
      expect(matchedCategories.has(category), `分类 ${category} 未由任何匹配技能产生`).toBe(true);
    }
  });

  it("对同一 fixture 重复分析结果稳定", () => {
    const first = analyzeJd(frontendVueJd);
    const second = analyzeJd(frontendVueJd);

    expect(first.ok && second.ok).toBe(true);

    if (!first.ok || !second.ok) {
      return;
    }

    expect(second.value.keywords, "重复分析的关键词结果不稳定").toEqual(first.value.keywords);
    expect(second.value.categories, "重复分析的分类结果不稳定").toEqual(first.value.categories);
  });
});
