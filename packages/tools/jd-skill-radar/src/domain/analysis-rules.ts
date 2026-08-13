import type { RequirementTone, SkillCategory } from "./types.ts";

export const TONE_WEIGHTS = {
  required: 4,
  preferred: 3,
  familiar: 2,
  neutral: 1,
} as const satisfies Readonly<Record<RequirementTone, number>>;

export const CATEGORY_ORDER = [
  "language",
  "framework",
  "css",
  "engineering",
  "performance",
  "nodejs",
  "cross-platform",
  "devops",
  "collaboration",
] as const satisfies readonly SkillCategory[];

export function getToneWeight(tone: RequirementTone): number {
  return TONE_WEIGHTS[tone];
}

export function compareTones(left: RequirementTone, right: RequirementTone): number {
  return getToneWeight(right) - getToneWeight(left);
}
