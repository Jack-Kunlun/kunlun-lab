export type RequirementTone = "required" | "preferred" | "familiar" | "neutral";

export type SkillCategory =
  | "language"
  | "framework"
  | "css"
  | "engineering"
  | "performance"
  | "nodejs"
  | "cross-platform"
  | "devops"
  | "collaboration";

export interface SkillDefinition {
  id: string;
  label: string;
  category: SkillCategory;
  aliases: readonly string[];
  checklistLabel: string;
  noteUrl?: string;
}

export interface RawSkillMatch {
  skillId: string;
  alias: string;
  start: number;
  end: number;
  context: string;
  tone: RequirementTone;
}
