import { CATEGORY_ORDER, TONE_WEIGHTS } from "./analysis-rules.ts";
import { getSkillDefinition } from "./skill-index.ts";
import type { JdCategoryScore, RawSkillMatch, SkillCategory } from "./types.ts";

export function scoreCategories(matches: readonly RawSkillMatch[]): JdCategoryScore[] {
  if (matches.length === 0) {
    return [];
  }

  const totals = new Map<SkillCategory, { rawWeight: number; matchCount: number }>();

  for (const match of matches) {
    const category = getSkillDefinition(match.skillId).category;
    const current = totals.get(category);

    if (current === undefined) {
      totals.set(category, {
        rawWeight: TONE_WEIGHTS[match.tone],
        matchCount: 1,
      });
      continue;
    }

    current.rawWeight += TONE_WEIGHTS[match.tone];
    current.matchCount += 1;
  }

  const maxRawWeight = Math.max(...[...totals.values()].map(({ rawWeight }) => rawWeight));

  return [...totals.entries()]
    .map(([category, { rawWeight, matchCount }]) => ({
      category,
      score: Math.max(1, Math.round((rawWeight / maxRawWeight) * 100)),
      matchCount,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.matchCount - left.matchCount ||
        CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category),
    );
}
