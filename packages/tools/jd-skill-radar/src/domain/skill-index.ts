import { SKILLS } from "./skill-dictionary.ts";
import type { SkillDefinition } from "./types.ts";

const SKILLS_BY_ID = new Map(SKILLS.map((definition) => [definition.id, definition]));

export function getSkillDefinition(skillId: string): SkillDefinition {
  const definition = SKILLS_BY_ID.get(skillId);

  if (definition === undefined) {
    throw new Error(`Unknown skillId "${skillId}" in JD analysis.`);
  }

  return definition;
}
