import type { JdAnalysis, RequirementTone, SkillCategory } from "./types.ts";

const CATEGORY_LABELS: Readonly<Record<SkillCategory, string>> = {
  language: "语言",
  framework: "框架",
  css: "CSS",
  engineering: "工程化",
  performance: "性能",
  nodejs: "Node.js",
  "cross-platform": "跨端",
  devops: "DevOps",
  collaboration: "协作",
};

const TONE_LABELS: Readonly<Record<RequirementTone, string>> = {
  required: "必须",
  preferred: "加分",
  familiar: "熟悉",
  neutral: "一般",
};

const DISCLAIMER = "> 分值仅表示当前 JD 文本的强调程度，不代表岗位好坏、用户能力或面试结果。";

function escapeInline(value: string): string {
  return value.replace(/\r?\n|\r/g, " ").replace(/([\\`*_[\]<>#])/g, "\\$1");
}

function escapeLinkDestination(value: string): string {
  return encodeURI(value).replaceAll("(", "%28").replaceAll(")", "%29");
}

export function toMarkdown(analysis: JdAnalysis, checkedIds: ReadonlySet<string>): string {
  const frameworks =
    analysis.overview.primaryFrameworks.length === 0
      ? "未识别"
      : analysis.overview.primaryFrameworks.map(escapeInline).join("、");
  const overview = [
    `- 岗位：${escapeInline(analysis.overview.role)}`,
    `- 经验：${escapeInline(analysis.overview.experience)}`,
    `- 学历：${escapeInline(analysis.overview.education)}`,
    `- 地点或工作方式：${escapeInline(analysis.overview.location)}`,
    `- 主要框架：${frameworks}`,
  ].join("\n");
  const categories = analysis.categories
    .map(
      ({ category, score, matchCount }) =>
        `- ${CATEGORY_LABELS[category]}：${String(score)} / 100（${String(matchCount)} 次命中）`,
    )
    .join("\n");
  const keywords = analysis.keywords
    .map(
      ({ label, category, count, tone }) =>
        `- ${escapeInline(label)}｜${CATEGORY_LABELS[category]}｜${String(count)} 次｜${TONE_LABELS[tone]}`,
    )
    .join("\n");
  const checklist = analysis.checklist
    .map((item) => {
      const marker = checkedIds.has(item.id) ? "x" : " ";
      const label = escapeInline(item.label);
      const content =
        item.noteUrl === undefined ? label : `[${label}](${escapeLinkDestination(item.noteUrl)})`;

      return `- [${marker}] ${content}`;
    })
    .join("\n");

  return `# 前端岗位 JD 技能雷达\n\n## 岗位概览\n${overview}\n\n## 技能分布\n${categories}\n\n## 关键词明细\n${keywords}\n\n## 准备清单\n${checklist}\n\n${DISCLAIMER}\n`;
}
