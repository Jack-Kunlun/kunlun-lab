import { describe, expect, it } from "vitest";
import { detectTone } from "./detect-tone.ts";

describe("detectTone", () => {
  it.each([
    ["必须熟练掌握 TypeScript", "required"],
    ["岗位要求具备 Vue 项目经验", "required"],
    ["有 Node.js 经验优先，作为加分项", "preferred"],
    ["熟悉 Vue 生态", "familiar"],
    ["了解前端性能优化", "familiar"],
    ["具备 Express 开发经验", "familiar"],
    ["使用 Git 协作", "neutral"],
  ] as const)("detects %s", (context, tone) => {
    expect(detectTone(context)).toBe(tone);
  });

  it("uses fixed precedence when multiple signals appear", () => {
    expect(detectTone("熟悉并优先考虑精通 TypeScript 的候选人")).toBe("required");
  });

  it("prioritizes preferred over familiar", () => {
    expect(detectTone("熟悉 Vue，优先考虑相关经验")).toBe("preferred");
  });
});
