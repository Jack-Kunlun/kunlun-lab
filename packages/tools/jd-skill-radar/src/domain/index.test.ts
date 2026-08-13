import { describe, expect, it } from "vitest";
import { analyzeJd, jdSkillRadarManifest, MAX_JD_LENGTH, MIN_JD_LENGTH } from "../index.ts";
import type { AnalyzeJdResult, JdAnalysis } from "../index.ts";

function acceptAnalysis(_analysis: JdAnalysis): void {
  void _analysis;
}

describe("JD radar package entry", () => {
  it("exports the draft manifest and public analysis API together", () => {
    expect(jdSkillRadarManifest.id).toBe("jd-skill-radar");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(MIN_JD_LENGTH).toBe(80);
    expect(MAX_JD_LENGTH).toBe(20_000);

    const exportedResult: AnalyzeJdResult = analyzeJd("TypeScript 与 Vue 工程实践。".repeat(6));

    expect(exportedResult.ok).toBe(true);

    if (exportedResult.ok) {
      acceptAnalysis(exportedResult.value);
    }
  });
});
