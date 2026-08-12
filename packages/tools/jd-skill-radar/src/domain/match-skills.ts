import { detectTone } from "./detect-tone.ts";
import {
  extractDisplayContext,
  extractLocalClause,
  foldForMatch,
  isAsciiWordCharacter,
} from "./normalize.ts";
import { SKILLS } from "./skill-dictionary.ts";
import type { RawSkillMatch, SkillDefinition } from "./types.ts";

interface SkillCandidate {
  skillId: string;
  alias: string;
  foldedAlias: string;
}

interface MatchInterval {
  start: number;
  end: number;
}

function flattenSkillCandidates(skills: readonly SkillDefinition[]): SkillCandidate[] {
  return skills
    .flatMap(({ aliases, id: skillId }) =>
      aliases.map((alias) => ({ skillId, alias, foldedAlias: foldForMatch(alias) })),
    )
    .sort((left, right) => {
      const lengthDifference = right.foldedAlias.length - left.foldedAlias.length;

      if (lengthDifference !== 0) {
        return lengthDifference;
      }

      const skillDifference = left.skillId.localeCompare(right.skillId);

      return skillDifference !== 0
        ? skillDifference
        : left.foldedAlias.localeCompare(right.foldedAlias);
    });
}

function containsAsciiAlphaNumeric(value: string): boolean {
  return /[A-Za-z0-9]/.test(value);
}

function hasAsciiWordBoundary(text: string, start: number, end: number): boolean {
  return !isAsciiWordCharacter(text[start - 1]) && !isAsciiWordCharacter(text[end]);
}

function overlapsAcceptedInterval(
  interval: MatchInterval,
  accepted: readonly MatchInterval[],
): boolean {
  return accepted.some(({ end, start }) => interval.start < end && interval.end > start);
}

function createRawMatch(
  text: string,
  candidate: SkillCandidate,
  start: number,
  end: number,
): RawSkillMatch {
  const clause = extractLocalClause(text, start, end);

  return {
    skillId: candidate.skillId,
    alias: text.slice(start, end),
    start,
    end,
    context: extractDisplayContext(text, start, end),
    tone: detectTone(clause),
  };
}

export function matchSkills(text: string): RawSkillMatch[] {
  const foldedText = foldForMatch(text);
  const acceptedIntervals: MatchInterval[] = [];
  const matches: RawSkillMatch[] = [];

  for (const candidate of flattenSkillCandidates(SKILLS)) {
    let start = foldedText.indexOf(candidate.foldedAlias);

    while (start !== -1) {
      const end = start + candidate.foldedAlias.length;
      const interval = { start, end };
      const boundaryValid =
        !containsAsciiAlphaNumeric(candidate.foldedAlias) ||
        hasAsciiWordBoundary(foldedText, start, end);

      if (boundaryValid && !overlapsAcceptedInterval(interval, acceptedIntervals)) {
        acceptedIntervals.push(interval);
        matches.push(createRawMatch(text, candidate, start, end));
      }

      start = foldedText.indexOf(candidate.foldedAlias, start + 1);
    }
  }

  return matches.sort((left, right) => {
    const startDifference = left.start - right.start;

    if (startDifference !== 0) {
      return startDifference;
    }

    const endDifference = left.end - right.end;

    return endDifference !== 0 ? endDifference : left.skillId.localeCompare(right.skillId);
  });
}
