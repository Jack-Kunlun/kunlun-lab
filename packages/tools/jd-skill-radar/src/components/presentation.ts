import type { RequirementTone, SkillCategory } from "../domain/types.ts";

export const SKILL_CATEGORY_LABELS = {
  language: "语言",
  framework: "框架",
  css: "CSS",
  engineering: "工程化",
  performance: "性能",
  nodejs: "Node.js",
  "cross-platform": "跨端",
  devops: "DevOps",
  collaboration: "协作",
} as const satisfies Readonly<Record<SkillCategory, string>>;

export const REQUIREMENT_TONE_LABELS = {
  required: "必须",
  preferred: "加分",
  familiar: "熟悉",
  neutral: "提及",
} as const satisfies Readonly<Record<RequirementTone, string>>;
