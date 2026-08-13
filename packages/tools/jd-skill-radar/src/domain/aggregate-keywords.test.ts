import { describe, expect, it } from "vitest";
import { aggregateKeywords } from "./aggregate-keywords.ts";
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

describe("aggregateKeywords", () => {
  it("aggregates repeated matches with the strongest tone and unique contexts", () => {
    const matches = [
      match({ tone: "neutral", context: "first context" }),
      match({ tone: "required", context: "required context" }),
      match({ tone: "familiar", context: "first context" }),
    ];

    expect(aggregateKeywords(matches)).toEqual([
      {
        skillId: "typescript",
        label: "TypeScript",
        category: "language",
        count: 3,
        tone: "required",
        contexts: ["first context", "required context"],
        totalWeight: 7,
      },
    ]);
  });

  it("sorts by total weight, count, label, then skill ID", () => {
    const matches = [
      match({ skillId: "javascript", alias: "JavaScript", context: "javascript" }),
      match({ skillId: "typescript", context: "typescript one", tone: "preferred" }),
      match({ skillId: "typescript", context: "typescript two", tone: "neutral" }),
      match({ skillId: "css", alias: "CSS", context: "css" }),
      match({ skillId: "sass", alias: "Sass", context: "sass" }),
    ];

    expect(aggregateKeywords(matches).map(({ skillId }) => skillId)).toEqual([
      "typescript",
      "css",
      "javascript",
      "sass",
    ]);
  });

  it("throws for an unknown skill ID", () => {
    expect(() => aggregateKeywords([match({ skillId: "missing" })])).toThrow(
      // prettier-ignore
      "Unknown skillId \"missing\" in JD analysis.",
    );
  });
});
