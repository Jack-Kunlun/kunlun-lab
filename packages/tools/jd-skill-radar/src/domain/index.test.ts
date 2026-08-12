import { describe, expect, it } from "vitest";
import {
  SKILLS,
  VERIFIED_NOTE_LINKS,
  detectTone,
  jdSkillRadarManifest,
  matchSkills,
} from "../index.ts";

describe("JD radar package entry", () => {
  it("exports the draft manifest and pure domain APIs together", () => {
    expect(jdSkillRadarManifest.id).toBe("jd-skill-radar");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(SKILLS.length).toBeGreaterThan(0);
    expect(matchSkills("TypeScript")).toHaveLength(1);
    expect(detectTone("必须掌握")).toBe("required");
    expect(VERIFIED_NOTE_LINKS).toEqual({});
  });
});
