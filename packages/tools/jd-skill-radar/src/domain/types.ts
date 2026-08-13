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

export type JdInputErrorCode = "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "NO_SKILLS";

export interface JdInputError {
  code: JdInputErrorCode;
  message: string;
}

export interface JdOverview {
  role: string;
  experience: string;
  education: string;
  location: string;
  primaryFrameworks: string[];
}

export interface JdCategoryScore {
  category: SkillCategory;
  score: number;
  matchCount: number;
}

export interface JdKeyword {
  skillId: string;
  label: string;
  category: SkillCategory;
  count: number;
  tone: RequirementTone;
  contexts: string[];
}

export interface JdChecklistItem {
  id: string;
  label: string;
  noteUrl?: string;
}

export interface JdAnalysis {
  overview: JdOverview;
  categories: JdCategoryScore[];
  keywords: JdKeyword[];
  checklist: JdChecklistItem[];
  meta: {
    characterCount: number;
    skillCount: number;
    categoryCount: number;
  };
}

export type AnalyzeJdResult = { ok: true; value: JdAnalysis } | { ok: false; error: JdInputError };
