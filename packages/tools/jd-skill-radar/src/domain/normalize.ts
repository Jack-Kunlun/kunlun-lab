export const MAX_CONTEXT_LENGTH = 80;

const CLAUSE_DELIMITERS = new Set([
  "\n",
  "\r",
  "，",
  ",",
  "。",
  ".",
  ";",
  "；",
  "!",
  "！",
  "?",
  "？",
]);

export function foldForMatch(value: string): string {
  return Array.from(value, (character) =>
    /^[A-Z]$/.test(character) ? character.toLocaleLowerCase("en-US") : character,
  ).join("");
}

export function isAsciiWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /^[A-Za-z0-9_]$/.test(value);
}

export function extractLocalClause(text: string, start: number, end: number): string {
  let clauseStart = start - 1;

  while (clauseStart >= 0 && !CLAUSE_DELIMITERS.has(text[clauseStart] ?? "")) {
    clauseStart -= 1;
  }

  let clauseEnd = end;

  while (clauseEnd < text.length && !CLAUSE_DELIMITERS.has(text[clauseEnd] ?? "")) {
    clauseEnd += 1;
  }

  return text.slice(clauseStart + 1, clauseEnd).trim();
}

export function extractDisplayContext(text: string, start: number, end: number): string {
  const matchLength = end - start;

  if (matchLength >= MAX_CONTEXT_LENGTH) {
    return text.slice(start, end).slice(0, MAX_CONTEXT_LENGTH).trim();
  }

  const availableLength = MAX_CONTEXT_LENGTH - matchLength;
  let leftBudget = Math.floor(availableLength / 2);
  let rightBudget = availableLength - leftBudget;
  const leftLength = Math.min(start, leftBudget);

  leftBudget -= leftLength;
  rightBudget += leftBudget;

  const rightLength = Math.min(text.length - end, rightBudget);

  rightBudget -= rightLength;

  const finalLeftLength = Math.min(start, leftLength + rightBudget);
  const contextStart = start - finalLeftLength;
  const contextEnd = Math.min(text.length, end + rightLength);

  return text.slice(contextStart, contextEnd).trim();
}
