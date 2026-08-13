import type { AggregatedKeyword } from "./aggregate-keywords.ts";
import { compareTones } from "./analysis-rules.ts";
import { getSkillDefinition } from "./skill-index.ts";
import type { JdChecklistItem } from "./types.ts";

export function buildChecklist(keywords: readonly AggregatedKeyword[]): JdChecklistItem[] {
  return [...keywords]
    .sort(
      (left, right) =>
        compareTones(left.tone, right.tone) ||
        right.count - left.count ||
        left.label.localeCompare(right.label) ||
        left.skillId.localeCompare(right.skillId),
    )
    .map((keyword) => {
      const definition = getSkillDefinition(keyword.skillId);

      return definition.noteUrl === undefined
        ? { id: `prepare:${definition.id}`, label: definition.checklistLabel }
        : {
            id: `prepare:${definition.id}`,
            label: definition.checklistLabel,
            noteUrl: definition.noteUrl,
          };
    });
}
