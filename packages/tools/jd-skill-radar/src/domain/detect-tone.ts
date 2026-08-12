import type { RequirementTone } from "./types.ts";

const toneSignals = [
  { tone: "required", signals: ["必须", "要求", "熟练掌握", "精通", "必备"] },
  { tone: "preferred", signals: ["优先考虑", "优先", "加分项", "加分"] },
  { tone: "familiar", signals: ["具备", "具备经验", "有经验", "熟悉", "了解"] },
] as const satisfies readonly {
  tone: Exclude<RequirementTone, "neutral">;
  signals: readonly string[];
}[];

export function detectTone(context: string): RequirementTone {
  for (const { tone, signals } of toneSignals) {
    if (signals.some((signal) => context.includes(signal))) {
      return tone;
    }
  }

  return "neutral";
}
