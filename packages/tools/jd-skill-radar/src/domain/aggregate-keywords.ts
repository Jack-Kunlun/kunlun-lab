import { compareTones, getToneWeight } from "./analysis-rules.ts";
import { getSkillDefinition } from "./skill-index.ts";
import type { JdKeyword, RawSkillMatch } from "./types.ts";

export interface AggregatedKeyword extends JdKeyword {
  totalWeight: number;
}

export function aggregateKeywords(matches: readonly RawSkillMatch[]): AggregatedKeyword[] {
  const aggregates = new Map<string, AggregatedKeyword>();

  for (const match of matches) {
    const definition = getSkillDefinition(match.skillId);
    const current = aggregates.get(match.skillId);

    if (current === undefined) {
      aggregates.set(match.skillId, {
        skillId: definition.id,
        label: definition.label,
        category: definition.category,
        count: 1,
        tone: match.tone,
        contexts: [match.context],
        totalWeight: getToneWeight(match.tone),
      });
      continue;
    }

    current.count += 1;

    current.totalWeight += getToneWeight(match.tone);

    if (compareTones(match.tone, current.tone) < 0) {
      current.tone = match.tone;
    }

    if (!current.contexts.includes(match.context)) {
      current.contexts.push(match.context);
    }
  }

  return [...aggregates.values()].sort(
    (left, right) =>
      right.totalWeight - left.totalWeight ||
      right.count - left.count ||
      left.label.localeCompare(right.label) ||
      left.skillId.localeCompare(right.skillId),
  );
}
