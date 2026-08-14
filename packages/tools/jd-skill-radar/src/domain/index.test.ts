import { describe, expect, it } from "vitest";
import {
  analyzeJd,
  detectTone,
  jdSkillRadarManifest,
  matchSkills,
  MAX_JD_LENGTH,
  MIN_JD_LENGTH,
  SKILLS,
  toMarkdown,
  VERIFIED_NOTE_LINKS,
} from "../index.ts";
import type { AnalyzeJdResult, JdAnalysis } from "../index.ts";

function acceptAnalysis(_analysis: JdAnalysis): void {
  void _analysis;
}

describe("JD radar package entry", () => {
  it("exports the draft manifest and public analysis API together", () => {
    expect(jdSkillRadarManifest.id).toBe("jd-skill-radar");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(SKILLS.length).toBeGreaterThan(0);
    expect(matchSkills("TypeScript")).toHaveLength(1);
    expect(detectTone("必须掌握")).toBe("required");
    expect(VERIFIED_NOTE_LINKS).toEqual({});
    expect(MIN_JD_LENGTH).toBe(80);
    expect(MAX_JD_LENGTH).toBe(20_000);
    expect(typeof toMarkdown).toBe("function");

    const exportedResult: AnalyzeJdResult = analyzeJd("TypeScript 与 Vue 工程实践。".repeat(6));

    expect(exportedResult.ok).toBe(true);

    if (exportedResult.ok) {
      acceptAnalysis(exportedResult.value);
    }
  });
});
