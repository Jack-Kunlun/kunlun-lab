import { describe, expect, it } from "vitest";
import { matchSkills } from "./match-skills.ts";

describe("matchSkills", () => {
  it("matches common aliases and preserves original text positions", () => {
    const text = "熟悉 Vue 3、TypeScript 和 Vite，具备 Node.js 服务开发经验";
    const matches = matchSkills(text);

    expect(matches.map(({ skillId }) => skillId)).toEqual(["vue", "typescript", "vite", "nodejs"]);
    expect(matches.every(({ alias, end, start }) => text.slice(start, end) === alias)).toBe(true);
  });

  it("keeps repeated non-overlapping occurrences in original order", () => {
    const matches = matchSkills("Vue 项目迁移到 Vue 3");

    expect(matches.map(({ alias, skillId }) => ({ alias, skillId }))).toEqual([
      { alias: "Vue", skillId: "vue" },
      { alias: "Vue 3", skillId: "vue" },
    ]);
    expect(matches[0]?.start).toBeLessThan(matches[1]?.start ?? 0);
  });

  it("returns an empty result for empty or unrelated text", () => {
    expect(matchSkills("")).toEqual([]);
    expect(matchSkills("负责客户沟通与合同归档")).toEqual([]);
  });

  it.each([
    ["维护 React Native 应用", ["react-native"]],
    ["使用 Vue Router 管理路由", ["vue-router"]],
    ["采用 Tailwind CSS 构建设计系统", ["tailwind-css"]],
  ] as const)("prefers the longest alias without nested matches", (text, skillIds) => {
    expect(matchSkills(text).map(({ skillId }) => skillId)).toEqual(skillIds);
  });

  it("does not match aliases inside longer ASCII words", () => {
    expect(matchSkills("digital reactive GitLab workflow")).toEqual([]);
  });

  it("limits display context to 80 characters", () => {
    const matches = matchSkills(`${"a".repeat(60)} TypeScript ${"b".repeat(60)}`);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.context.length).toBeLessThanOrEqual(80);
    expect(matches[0]?.context).toContain("TypeScript");
  });

  it("detects tone from each local clause rather than shared display context", () => {
    const matches = matchSkills("熟悉 Vue，TypeScript 优先");

    expect(matches.map(({ skillId, tone }) => ({ skillId, tone }))).toEqual([
      { skillId: "vue", tone: "familiar" },
      { skillId: "typescript", tone: "preferred" },
    ]);
  });
});
