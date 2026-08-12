import { describe, expect, it } from "vitest";
import { VERIFIED_NOTE_LINKS } from "./note-links.ts";
import { SKILLS } from "./skill-dictionary.ts";

const expectedSkillIds = [
  "angular",
  "ci-cd",
  "code-review",
  "componentization",
  "css",
  "docker",
  "electron",
  "express",
  "git",
  "html",
  "javascript",
  "nextjs",
  "nodejs",
  "performance",
  "pinia",
  "react",
  "react-native",
  "rollup",
  "sass",
  "tailwind-css",
  "testing",
  "typescript",
  "uniapp",
  "vite",
  "vue",
  "vue-router",
  "webpack",
  "agile-collaboration",
].sort();

describe("SKILLS", () => {
  it("provides the finite v1 skills with stable unique IDs and aliases", () => {
    const ids = SKILLS.map(({ id }) => id);
    const aliases = SKILLS.flatMap(({ aliases: skillAliases }) =>
      skillAliases.map((alias) => alias.toLocaleLowerCase("en-US")),
    );

    expect([...ids].sort()).toEqual(expectedSkillIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(
      SKILLS.every(
        ({ aliases: skillAliases, checklistLabel, label }) =>
          skillAliases.length > 0 && checklistLabel.trim().length > 0 && label.trim().length > 0,
      ),
    ).toBe(true);
  });

  it("does not invent unverified knowledge-base links", () => {
    expect(VERIFIED_NOTE_LINKS).toEqual({});
    expect(SKILLS.every(({ noteUrl }) => noteUrl === undefined)).toBe(true);
  });
});
