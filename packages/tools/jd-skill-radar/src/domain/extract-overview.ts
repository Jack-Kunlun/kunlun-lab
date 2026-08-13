import type { AggregatedKeyword } from "./aggregate-keywords.ts";
import type { JdOverview } from "./types.ts";

const UNRECOGNIZED = "未识别";

interface ExperiencePattern {
  pattern: RegExp;
  format: (groups: string[]) => string;
}

const EXPERIENCE_PATTERNS: readonly ExperiencePattern[] = [
  {
    pattern: /(\d+)\s*[-–~]\s*(\d+)\s*年/g,
    format: (groups: string[]) => `${groups[0] ?? ""}–${groups[1] ?? ""} 年`,
  },
  {
    pattern: /(\d+)\s*年\s*(?:及以上|以上)/g,
    format: (groups: string[]) => `${groups[0] ?? ""} 年以上`,
  },
  {
    pattern: /至少\s*(\d+)\s*年/g,
    format: (groups: string[]) => `${groups[0] ?? ""} 年以上`,
  },
] as const;

function extractRole(text: string): string {
  const lines = text.split(/\r?\n|\r/);
  const explicitPattern = /^(?:招聘职位|岗位|职位)\s*[:：]\s*(.+)$/;

  for (const line of lines) {
    const match = explicitPattern.exec(line.trim());

    if (match?.[1].trim()) {
      return match[1].trim();
    }
  }

  const rolePrefixes = ["岗位职责", "岗位要求", "职位描述", "职责", "要求", "描述"];
  const punctuationEnding = /[。；;！!？?]$/;
  const nonEmptyLines = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    nonEmptyLines.find(
      (line) =>
        line.length <= 40 &&
        /前端|开发|工程师/.test(line) &&
        !rolePrefixes.some((prefix) => line.startsWith(prefix)) &&
        !punctuationEnding.test(line),
    ) ?? UNRECOGNIZED
  );
}

function extractExperience(text: string): string {
  const candidates: { index: number; value: string }[] = [];

  for (const { pattern, format } of EXPERIENCE_PATTERNS) {
    pattern.lastIndex = 0;

    for (const match of text.matchAll(pattern)) {
      const index = match.index;

      candidates.push({ index, value: format(match.slice(1)) });
    }
  }

  candidates.sort((left, right) => left.index - right.index);

  return candidates[0]?.value ?? UNRECOGNIZED;
}

function extractEducation(text: string): string {
  const educationTerms: readonly (readonly [string, string])[] = [
    ["学历不限", "学历不限"],
    ["博士", "博士"],
    ["硕士", "硕士"],
    ["研究生", "硕士"],
    ["本科", "本科"],
    ["大专", "大专"],
    ["专科", "大专"],
  ];
  const candidates = educationTerms
    .map(([term, value]) => ({ index: text.indexOf(term), value }))
    .filter((candidate) => candidate.index >= 0)
    .sort((left, right) => left.index - right.index);

  return candidates[0]?.value ?? UNRECOGNIZED;
}

function extractLocation(text: string): string {
  const lines = text.split(/\r?\n|\r/);
  const locationPattern = /^(?:工作地点|地点|城市)\s*[:：]\s*(.+)$/;
  let location: string | undefined;

  for (const line of lines) {
    const match = locationPattern.exec(line.trim());

    if (match?.[1].trim()) {
      location = match[1].trim();
      break;
    }
  }

  const workModes = ["远程办公", "混合办公", "现场办公"]
    .map((value) => ({ value, index: text.indexOf(value) }))
    .filter((candidate) => candidate.index >= 0)
    .sort((left, right) => left.index - right.index);
  const mode = workModes[0]?.value;

  if (location && mode) {
    return `${location} / ${mode}`;
  }

  return location ?? mode ?? UNRECOGNIZED;
}

function selectPrimaryFrameworks(keywords: readonly AggregatedKeyword[]): string[] {
  return [...keywords]
    .filter((keyword) => keyword.category === "framework")
    .sort(
      (left, right) =>
        right.totalWeight - left.totalWeight ||
        right.count - left.count ||
        left.label.localeCompare(right.label) ||
        left.skillId.localeCompare(right.skillId),
    )
    .slice(0, 3)
    .map((keyword) => keyword.label);
}

export function extractOverview(text: string, keywords: readonly AggregatedKeyword[]): JdOverview {
  return {
    role: extractRole(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    location: extractLocation(text),
    primaryFrameworks: selectPrimaryFrameworks(keywords),
  };
}
