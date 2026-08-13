import { aggregateKeywords } from "./aggregate-keywords.ts";
import { buildChecklist } from "./build-checklist.ts";
import { extractOverview } from "./extract-overview.ts";
import { matchSkills } from "./match-skills.ts";
import { scoreCategories } from "./score-categories.ts";
import type { AnalyzeJdResult, JdInputError, JdKeyword } from "./types.ts";
import { validateInput } from "./validate-input.ts";

const NO_SKILLS_ERROR: JdInputError = Object.freeze({
  code: "NO_SKILLS",
  message: "没有识别到当前词典支持的前端技能。",
});

export function analyzeJd(text: string): AnalyzeJdResult {
  const validationError = validateInput(text);

  if (validationError !== undefined) {
    return { ok: false, error: validationError };
  }

  const matches = matchSkills(text);

  if (matches.length === 0) {
    return { ok: false, error: NO_SKILLS_ERROR };
  }

  const aggregatedKeywords = aggregateKeywords(matches);
  const categories = scoreCategories(matches);
  const overview = extractOverview(text, aggregatedKeywords);
  const checklist = buildChecklist(aggregatedKeywords);
  const keywords: JdKeyword[] = aggregatedKeywords.map(
    ({ totalWeight: _totalWeight, ...keyword }) => keyword,
  );

  return {
    ok: true,
    value: {
      overview,
      categories,
      keywords,
      checklist,
      meta: {
        characterCount: text.length,
        skillCount: keywords.length,
        categoryCount: categories.length,
      },
    },
  };
}
