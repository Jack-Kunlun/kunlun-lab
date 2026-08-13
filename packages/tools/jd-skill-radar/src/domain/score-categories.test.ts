import { describe, expect, it } from "vitest";
import { scoreCategories } from "./score-categories.ts";
import type { RawSkillMatch } from "./types.ts";

const match = (overrides: Partial<RawSkillMatch>): RawSkillMatch => ({
  skillId: "typescript",
  alias: "TypeScript",
  start: 0,
  end: 10,
  context: "TypeScript context",
  tone: "neutral",
  ...overrides,
});

describe("scoreCategories", () => {
  it("scores every occurrence and normalizes against the strongest category", () => {
    expect(
      scoreCategories([
        match({ skillId: "typescript", tone: "required", context: "first TypeScript context" }),
        match({
          skillId: "typescript",
          tone: "required",
          start: 24,
          end: 34,
          context: "second TypeScript context",
        }),
        match({ skillId: "vue", alias: "Vue", tone: "preferred" }),
        match({ skillId: "git", alias: "Git", tone: "neutral" }),
      ]),
    ).toEqual([
      { category: "language", score: 100, matchCount: 2 },
      { category: "framework", score: 38, matchCount: 1 },
      { category: "collaboration", score: 13, matchCount: 1 },
    ]);
  });

  it("returns no categories for empty input", () => {
    expect(scoreCategories([])).toEqual([]);
  });

  it("uses CATEGORY_ORDER to break equal score and count ties", () => {
    expect(
      scoreCategories([
        match({ skillId: "css", alias: "CSS" }),
        match({ skillId: "vue", alias: "Vue" }),
        match({ skillId: "javascript", alias: "JavaScript" }),
      ]).map(({ category }) => category),
    ).toEqual(["language", "framework", "css"]);
  });

  it("throws for an unknown skill ID", () => {
    const unknownSkillId = "missing";

    expect(() => scoreCategories([match({ skillId: unknownSkillId })])).toThrow(
      `Unknown skillId "${unknownSkillId}" in JD analysis.`,
    );
  });
});
