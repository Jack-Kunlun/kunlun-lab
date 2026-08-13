# Task 8 JD Analysis Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Task 7 的原始技能命中确定性地聚合为输入状态、岗位概览、类别强调分、关键词明细、准备清单和分析元数据。

**Architecture:** 保持 JD 领域层为纯 TypeScript 管线。输入校验、关键词聚合、类别评分、概览提取和清单构建由独立纯函数负责，`analyzeJd` 只编排这些单元；Task 7 继续独占别名匹配、重叠消解、原文索引和局部语气判断。

**Tech Stack:** TypeScript 6、Vitest 4、pnpm workspace、Vue TS package typecheck、严格 type-aware ESLint、Prettier。

## Global Constraints

- 源码只使用 TypeScript；禁止 `any`、不安全断言和隐式宽类型。
- 使用双引号、分号、LF、UTF-8，并通过仓库严格 ESLint、TypeScript 与 Prettier 配置。
- `MIN_JD_LENGTH = 80`，`MAX_JD_LENGTH = 20_000`；字符数使用原始字符串的 UTF-16 `length`。
- 输入错误必须返回 `AnalyzeJdResult`，不得将普通输入状态作为异常抛出。
- 类别权重按每条非重叠命中累计：`required=4`、`preferred=3`、`familiar=2`、`neutral=1`。
- `CSS`、`Sass`、`Tailwind CSS` 均属于 `css`；不要在分析层建立额外分类映射。
- 概览只使用明确证据；缺失字符串字段统一为 `未识别`，不得推断技术关系、城市或岗位信息。
- 只识别明确地点字段及 `远程办公`、`混合办公`、`现场办公`，不维护城市白名单。
- 不猜测 `interview-notes` URL；没有已验证链接时省略 `noteUrl` 属性。
- 不修改 Task 7 匹配算法、manifest、Vue 组件、依赖、锁文件、主站内容或 `E:\interview-notes`。
- 不实现 Task 9 的 Markdown 导出、浏览器状态机、复制、下载或重置。
- 每个生产单元保留一次真实 RED/GREEN；只做计划指定的聚焦检查，避免重复全仓测试和生产构建。

---

## File Map

- `src/domain/types.ts`：Task 7 类型加 Task 8 公共结果类型。
- `src/domain/analysis-rules.ts`：语气权重、类别顺序及确定性比较函数。
- `src/domain/skill-index.ts`：静态词典索引与统一的内部契约错误。
- `src/domain/validate-input.ts`：空白、长度边界和稳定错误文案。
- `src/domain/aggregate-keywords.ts`：canonical skill 聚合、上下文去重及内部累计权重。
- `src/domain/score-categories.ts`：逐命中累计与 0–100 归一化。
- `src/domain/extract-overview.ts`：保守概览抽取和主要框架排序。
- `src/domain/build-checklist.ts`：去重清单及可选已验证链接。
- `src/domain/analyze-jd.ts`：管线编排与 `NO_SKILLS` 状态。
- `src/domain/fixtures/frontend-vue.ts`：跨模块成功分析夹具。
- `src/domain/index.ts`、`src/domain/index.test.ts`：公共包边界。

---

### Task 1: Analysis Contracts, Rules, and Input Validation

**Files:**
- Modify: `packages/tools/jd-skill-radar/src/domain/types.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/analysis-rules.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/validate-input.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/validate-input.test.ts`

**Interfaces:**
- Consumes: Task 7 的 `RequirementTone`、`SkillCategory`。
- Produces: `JdInputErrorCode`、`JdInputError`、`JdOverview`、`JdCategoryScore`、`JdKeyword`、`JdChecklistItem`、`JdAnalysis`、`AnalyzeJdResult`。
- Produces: `TONE_WEIGHTS`、`CATEGORY_ORDER`、`getToneWeight(tone)`、`compareTones(left, right)`。
- Produces: `MIN_JD_LENGTH`、`MAX_JD_LENGTH`、`validateInput(text): JdInputError | undefined`。

- [ ] **Step 1: Write the failing validation tests**

Create `validate-input.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_JD_LENGTH,
  MIN_JD_LENGTH,
  validateInput,
} from "./validate-input.ts";

describe("validateInput", () => {
  it("publishes stable length boundaries", () => {
    expect(MIN_JD_LENGTH).toBe(80);
    expect(MAX_JD_LENGTH).toBe(20_000);
  });

  it.each([
    ["", "EMPTY", "请粘贴一份前端岗位 JD。"],
    [" \r\n ", "EMPTY", "请粘贴一份前端岗位 JD。"],
    ["V".repeat(79), "TOO_SHORT", "JD 内容过短，请提供更完整的岗位描述。"],
    [
      "V".repeat(20_001),
      "TOO_LONG",
      "JD 内容超过 20,000 个字符，请缩短后重试。",
    ],
  ] as const)("returns %s as a stable input error", (text, code, message) => {
    expect(validateInput(text)).toEqual({ code, message });
  });

  it("accepts both exact length boundaries", () => {
    expect(validateInput("V".repeat(80))).toBeUndefined();
    expect(validateInput("V".repeat(20_000))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/validate-input.test.ts
```

Expected: FAIL because `validate-input.ts` does not exist. If package filtering triggers an incomplete root relink, run the package-local Vitest binary only after a successful frozen install in the Task 8 worktree; do not create manual workspace links.

- [ ] **Step 3: Extend the public contracts**

Append to `types.ts` exactly:

```ts
export type JdInputErrorCode = "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "NO_SKILLS";

export interface JdInputError {
  code: JdInputErrorCode;
  message: string;
}

export interface JdOverview {
  role: string;
  experience: string;
  education: string;
  location: string;
  primaryFrameworks: string[];
}

export interface JdCategoryScore {
  category: SkillCategory;
  score: number;
  matchCount: number;
}

export interface JdKeyword {
  skillId: string;
  label: string;
  category: SkillCategory;
  count: number;
  tone: RequirementTone;
  contexts: string[];
}

export interface JdChecklistItem {
  id: string;
  label: string;
  noteUrl?: string;
}

export interface JdAnalysis {
  overview: JdOverview;
  categories: JdCategoryScore[];
  keywords: JdKeyword[];
  checklist: JdChecklistItem[];
  meta: {
    characterCount: number;
    skillCount: number;
    categoryCount: number;
  };
}

export type AnalyzeJdResult =
  | { ok: true; value: JdAnalysis }
  | { ok: false; error: JdInputError };
```

Do not import the generic shared `Result`; the named union above is the stable public contract expected by Task 9.

- [ ] **Step 4: Implement stable analysis rules**

Create `analysis-rules.ts`:

```ts
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
```

- [ ] **Step 5: Implement input validation**

Create `validate-input.ts` with constants and fixed error objects:

```ts
import type { JdInputError } from "./types.ts";

export const MIN_JD_LENGTH = 80;
export const MAX_JD_LENGTH = 20_000;

const INPUT_ERRORS = {
  empty: { code: "EMPTY", message: "请粘贴一份前端岗位 JD。" },
  tooShort: { code: "TOO_SHORT", message: "JD 内容过短，请提供更完整的岗位描述。" },
  tooLong: {
    code: "TOO_LONG",
    message: "JD 内容超过 20,000 个字符，请缩短后重试。",
  },
} as const satisfies Readonly<Record<string, JdInputError>>;

export function validateInput(text: string): JdInputError | undefined {
  if (text.trim().length === 0) {
    return INPUT_ERRORS.empty;
  }

  if (text.length < MIN_JD_LENGTH) {
    return INPUT_ERRORS.tooShort;
  }

  return text.length > MAX_JD_LENGTH ? INPUT_ERRORS.tooLong : undefined;
}
```

- [ ] **Step 6: Run GREEN and scoped quality checks**

Run once each:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/validate-input.test.ts
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/types.ts packages/tools/jd-skill-radar/src/domain/analysis-rules.ts packages/tools/jd-skill-radar/src/domain/validate-input.ts packages/tools/jd-skill-radar/src/domain/validate-input.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain --check
git diff --check
```

Use the worktree-local `.bin/*.cmd` equivalents once if `pnpm exec` cannot resolve ESLint or Prettier. Do not run the package's entire test suite in this task.

- [ ] **Step 7: Commit the contracts and validation**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/types.ts packages/tools/jd-skill-radar/src/domain/analysis-rules.ts packages/tools/jd-skill-radar/src/domain/validate-input.ts packages/tools/jd-skill-radar/src/domain/validate-input.test.ts
git commit -m "feat(jd-radar): 添加分析契约与输入校验"
```

---

### Task 2: CSS Classification and Canonical Keyword Aggregation

**Files:**
- Modify: `packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts`
- Modify: `packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/skill-index.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/aggregate-keywords.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/aggregate-keywords.test.ts`

**Interfaces:**
- Consumes: `SKILLS`、`RawSkillMatch`、`JdKeyword`、`getToneWeight`、`compareTones`。
- Produces package-private `getSkillDefinition(skillId: string): SkillDefinition`，未知 ID 抛出统一内部契约错误。
- Produces package-private `AggregatedKeyword extends JdKeyword { totalWeight: number }`。
- Produces `aggregateKeywords(matches: readonly RawSkillMatch[]): AggregatedKeyword[]`。

- [ ] **Step 1: Add failing CSS category assertions**

Extend `skill-dictionary.test.ts`:

```ts
it("classifies CSS technologies in the dedicated css category", () => {
  const categories = Object.fromEntries(SKILLS.map(({ category, id }) => [id, category]));

  expect(categories.css).toBe("css");
  expect(categories.sass).toBe("css");
  expect(categories["tailwind-css"]).toBe("css");
});
```

- [ ] **Step 2: Write failing aggregation tests**

Create `aggregate-keywords.test.ts` with a local match builder and exact expectations:

```ts
import { describe, expect, it } from "vitest";
import { aggregateKeywords } from "./aggregate-keywords.ts";
import type { RawSkillMatch, RequirementTone } from "./types.ts";

function createMatch(
  skillId: string,
  tone: RequirementTone,
  context: string,
  start: number,
): RawSkillMatch {
  return {
    skillId,
    tone,
    context,
    alias: skillId,
    start,
    end: start + skillId.length,
  };
}

describe("aggregateKeywords", () => {
  it("aggregates occurrences, highest tone, unique contexts, and total weight", () => {
    const keywords = aggregateKeywords([
      createMatch("typescript", "neutral", "TypeScript 项目", 0),
      createMatch("typescript", "required", "必须掌握 TypeScript", 20),
      createMatch("typescript", "familiar", "TypeScript 项目", 50),
    ]);

    expect(keywords).toEqual([
      {
        skillId: "typescript",
        label: "TypeScript",
        category: "language",
        count: 3,
        tone: "required",
        contexts: ["TypeScript 项目", "必须掌握 TypeScript"],
        totalWeight: 7,
      },
    ]);
  });

  it("sorts by total weight, count, label, and skill ID", () => {
    const keywords = aggregateKeywords([
      createMatch("vue", "required", "必须掌握 Vue", 0),
      createMatch("javascript", "preferred", "JavaScript 优先", 20),
      createMatch("javascript", "neutral", "JavaScript", 40),
      createMatch("typescript", "required", "必须掌握 TypeScript", 60),
    ]);

    expect(keywords.map(({ skillId }) => skillId)).toEqual([
      "javascript",
      "typescript",
      "vue",
    ]);
  });

  it("throws for a match that violates the dictionary contract", () => {
    expect(() => aggregateKeywords([createMatch("missing", "neutral", "missing", 0)])).toThrow(
      'Unknown skillId "missing" in JD analysis.',
    );
  });
});
```

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/skill-dictionary.test.ts src/domain/aggregate-keywords.test.ts
```

Expected: CSS/Sass assertions fail and `aggregate-keywords.ts` is missing.

- [ ] **Step 4: Correct only CSS and Sass dictionary categories**

In `skill-dictionary.ts`, change exactly:

```ts
// id: "css"
category: "css",

// id: "sass"
category: "css",
```

Do not change IDs, aliases, labels, checklist text, or Tailwind CSS.

- [ ] **Step 5: Create one shared static skill index**

Create `skill-index.ts`:

```ts
import { SKILLS } from "./skill-dictionary.ts";
import type { SkillDefinition } from "./types.ts";

const SKILLS_BY_ID = new Map(SKILLS.map((definition) => [definition.id, definition]));

export function getSkillDefinition(skillId: string): SkillDefinition {
  const definition = SKILLS_BY_ID.get(skillId);

  if (definition === undefined) {
    throw new Error(`Unknown skillId "${skillId}" in JD analysis.`);
  }

  return definition;
}
```

Do not export the mutable map or add runtime dictionary repair.

- [ ] **Step 6: Implement deterministic aggregation**

Create `aggregate-keywords.ts`. Use a module-level `Map` from `SKILLS`, an insertion-ordered `Set<string>` for contexts, and this package-private output:

```ts
export interface AggregatedKeyword extends JdKeyword {
  totalWeight: number;
}

export function aggregateKeywords(
  matches: readonly RawSkillMatch[],
): AggregatedKeyword[];
```

For each match:

1. resolve its dictionary definition with `getSkillDefinition(match.skillId)`;
2. initialize `count=0`, `tone="neutral"`, `contexts=[]`, `totalWeight=0`;
3. increment `count` and add `getToneWeight(match.tone)` for every occurrence;
4. replace the aggregate tone only when `compareTones(match.tone, currentTone) < 0`;
5. append `context` only when its exact string has not appeared for that skill;
6. sort by `totalWeight` descending, `count` descending, `label.localeCompare`, then `skillId.localeCompare`.

Do not expose the internal `Set` or mutate `RawSkillMatch`.

- [ ] **Step 7: Run GREEN and scoped checks**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/skill-dictionary.test.ts src/domain/aggregate-keywords.test.ts
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts packages/tools/jd-skill-radar/src/domain/skill-index.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts packages/tools/jd-skill-radar/src/domain/skill-index.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.test.ts --check
git diff --check
```

- [ ] **Step 8: Commit the classification and aggregation**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts packages/tools/jd-skill-radar/src/domain/skill-index.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.ts packages/tools/jd-skill-radar/src/domain/aggregate-keywords.test.ts
git commit -m "feat(jd-radar): 聚合技能关键词事实"
```

---

### Task 3: Category Scoring with Repeated-Occurrence Weighting

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/score-categories.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/score-categories.test.ts`

**Interfaces:**
- Consumes: `RawSkillMatch[]`、`getSkillDefinition`、`TONE_WEIGHTS`、`CATEGORY_ORDER`。
- Produces: `scoreCategories(matches: readonly RawSkillMatch[]): JdCategoryScore[]`。

- [ ] **Step 1: Write failing score and ordering tests**

Create `score-categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreCategories } from "./score-categories.ts";
import type { RawSkillMatch, RequirementTone } from "./types.ts";

function createMatch(skillId: string, tone: RequirementTone, start: number): RawSkillMatch {
  return {
    skillId,
    tone,
    context: skillId,
    alias: skillId,
    start,
    end: start + skillId.length,
  };
}

describe("scoreCategories", () => {
  it("accumulates every occurrence and normalizes the strongest category to 100", () => {
    const categories = scoreCategories([
      createMatch("typescript", "required", 0),
      createMatch("typescript", "required", 20),
      createMatch("vue", "preferred", 40),
      createMatch("git", "neutral", 60),
    ]);

    expect(categories).toEqual([
      { category: "language", score: 100, matchCount: 2 },
      { category: "framework", score: 38, matchCount: 1 },
      { category: "collaboration", score: 13, matchCount: 1 },
    ]);
  });

  it("uses score, count, then fixed category order and omits absent categories", () => {
    const categories = scoreCategories([
      createMatch("typescript", "neutral", 0),
      createMatch("vue", "neutral", 20),
      createMatch("tailwind-css", "neutral", 40),
    ]);

    expect(categories.map(({ category }) => category)).toEqual([
      "language",
      "framework",
      "css",
    ]);
    expect(categories.every(({ score }) => score === 100)).toBe(true);
  });

  it("returns an empty list when no matches exist", () => {
    expect(scoreCategories([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/score-categories.test.ts
```

Expected: FAIL because `score-categories.ts` does not exist.

- [ ] **Step 3: Implement per-occurrence scoring**

Create `score-categories.ts` with one dictionary lookup and one category accumulator. Required signature:

```ts
export function scoreCategories(
  matches: readonly RawSkillMatch[],
): JdCategoryScore[];
```

Implementation requirements:

- each match adds its tone weight and increments `matchCount`;
- unknown IDs flow through `getSkillDefinition` and throw the same exact internal-contract error used by aggregation;
- return `[]` before calculating a maximum when there are no matches;
- calculate `score = Math.max(1, Math.round(rawWeight / maxRawWeight * 100))`;
- use `CATEGORY_ORDER.indexOf(category)` only as the final ordering key;
- never group by unique skill ID before scoring.

- [ ] **Step 4: Run GREEN**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/score-categories.test.ts
```

Expected: PASS.

- [ ] **Step 5: Perform the required repeated-occurrence mutation**

Temporarily add a seen-skill guard that prevents the second TypeScript match from contributing. Run the same focused test once.

Expected: the first test fails because `language` no longer has raw weight `8`; framework normalizes to `75` instead of `38` or the expected output otherwise differs.

Restore the real per-occurrence implementation with `apply_patch`, then rerun the focused test once and require PASS. Do not retain mutation files or comments.

- [ ] **Step 6: Run scoped quality checks**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/score-categories.ts packages/tools/jd-skill-radar/src/domain/score-categories.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain/score-categories.ts packages/tools/jd-skill-radar/src/domain/score-categories.test.ts --check
git diff --check
```

- [ ] **Step 7: Commit category scoring**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/score-categories.ts packages/tools/jd-skill-radar/src/domain/score-categories.test.ts
git commit -m "feat(jd-radar): 计算类别强调分"
```

---

### Task 4: Conservative Overview Extraction

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/extract-overview.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/extract-overview.test.ts`

**Interfaces:**
- Consumes: original JD `text` and `readonly AggregatedKeyword[]`。
- Produces: `extractOverview(text, keywords): JdOverview`。

- [ ] **Step 1: Write failing role, experience, and education tests**

Create `extract-overview.test.ts`. Import `extractOverview` and define a typed keyword helper using `AggregatedKeyword`.

Add these exact cases:

```ts
it.each([
  ["岗位：高级前端开发工程师", "高级前端开发工程师"],
  ["招聘职位: Web 前端工程师", "Web 前端工程师"],
  ["\n产品说明\n高级前端开发工程师\n岗位职责", "高级前端开发工程师"],
  ["岗位职责：负责前端开发。", "未识别"],
])("extracts a conservative role from %s", (text, role) => {
  expect(extractOverview(text, []).role).toBe(role);
});

it.each([
  ["需要 3-5年开发经验", "3–5 年"],
  ["至少3年经验", "3 年以上"],
  ["5 年及以上经验", "5 年以上"],
  ["2~4 年优先，5 年以上亦可", "2–4 年"],
])("normalizes the earliest explicit experience in %s", (text, experience) => {
  expect(extractOverview(text, []).experience).toBe(experience);
});

it.each([
  ["学历要求：研究生", "硕士"],
  ["本科及以上学历", "本科"],
  ["大专学历", "大专"],
  ["学历不限", "学历不限"],
  ["具备良好的学习能力", "未识别"],
])("extracts only explicit education from %s", (text, education) => {
  expect(extractOverview(text, []).education).toBe(education);
});
```

- [ ] **Step 2: Add failing location and framework tests**

```ts
it.each([
  ["工作地点：杭州\n支持混合办公", "杭州 / 混合办公"],
  ["城市: 上海", "上海"],
  ["支持远程办公", "远程办公"],
  ["负责杭州客户项目交付", "未识别"],
])("extracts only explicit location evidence from %s", (text, location) => {
  expect(extractOverview(text, []).location).toBe(location);
});

it("returns at most three explicitly matched frameworks without inference", () => {
  const keywords = [
    createKeyword("nextjs", "Next.js", 8, 2),
    createKeyword("vue", "Vue", 4, 1),
    createKeyword("angular", "Angular", 3, 1),
    createKeyword("react", "React", 1, 1),
  ];

  expect(extractOverview("职位：前端工程师", keywords).primaryFrameworks).toEqual([
    "Next.js",
    "Vue",
    "Angular",
  ]);
});
```

`createKeyword` must produce a valid `AggregatedKeyword` with `category: "framework"`, `tone: "neutral"`, empty contexts, supplied `totalWeight` and `count`; do not use `any` or double assertions.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/extract-overview.test.ts
```

Expected: FAIL because `extract-overview.ts` does not exist.

- [ ] **Step 4: Implement bounded line helpers and explicit extractors**

Create `extract-overview.ts` with private helpers:

```ts
function extractRole(text: string): string;
function extractExperience(text: string): string;
function extractEducation(text: string): string;
function extractLocation(text: string): string;
function selectPrimaryFrameworks(
  keywords: readonly AggregatedKeyword[],
): string[];
export function extractOverview(
  text: string,
  keywords: readonly AggregatedKeyword[],
): JdOverview;
```

Implementation constraints:

- split lines with `/\r?\n|\r/`, trim only for field recognition;
- explicit role fields use `/^(?:招聘职位|岗位|职位)\s*[:：]\s*(.+)$/` and accept only a non-empty captured same-line value;
- fallback role inspects only the first five non-empty lines, requires length `<=40`, includes at least one of `前端|开发|工程师`, rejects lines beginning `岗位职责|岗位要求|职位描述|职责|要求|描述`, and rejects lines ending `。|；|;|！|!|？|?`;
- collect experience candidates with source index using these patterns in this order, while still choosing the globally smallest `match.index` before formatting:

```ts
const EXPERIENCE_PATTERNS = [
  { pattern: /(\d+)\s*[-–~]\s*(\d+)\s*年/g, format: (from: string, to: string) => `${from}–${to} 年` },
  { pattern: /(\d+)\s*年\s*(?:及以上|以上)/g, format: (years: string) => `${years} 年以上` },
  { pattern: /至少\s*(\d+)\s*年/g, format: (years: string) => `${years} 年以上` },
] as const;
```

- use an internal `{ index: number; value: string }` candidate shape; never compare the order in which regexes are declared instead of original source position;
- collect education candidates by exact `indexOf` for `学历不限`, `博士`, `硕士`, `研究生`, `本科`, `大专`, `专科`; map them respectively to `学历不限`, `博士`, `硕士`, `硕士`, `本科`, `大专`, `大专`, discard `-1`, then choose the smallest index;
- location fields use `/^(?:工作地点|地点|城市)\s*[:：]\s*(.+)$/`; choose the first non-empty field value in line order;
- work mode is the earliest of the three exact phrases; combine with ` / ` only when both exist;
- framework selection filters `category === "framework"`, then sorts by `totalWeight`, `count`, `label`, `skillId`, and slices to three.

- [ ] **Step 5: Run GREEN and scoped checks**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/extract-overview.test.ts
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/extract-overview.ts packages/tools/jd-skill-radar/src/domain/extract-overview.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain/extract-overview.ts packages/tools/jd-skill-radar/src/domain/extract-overview.test.ts --check
git diff --check
```

- [ ] **Step 6: Commit conservative overview extraction**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/extract-overview.ts packages/tools/jd-skill-radar/src/domain/extract-overview.test.ts
git commit -m "feat(jd-radar): 提取有证据的岗位概览"
```

---

### Task 5: Deduplicated Preparation Checklist

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/build-checklist.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/build-checklist.test.ts`

**Interfaces:**
- Consumes: `readonly AggregatedKeyword[]` and `getSkillDefinition`。
- Produces: `buildChecklist(keywords): JdChecklistItem[]`。

- [ ] **Step 1: Write failing checklist tests**

Create `build-checklist.test.ts` with a fully typed helper and these assertions:

```ts
describe("buildChecklist", () => {
  it("creates one stable item per canonical skill", () => {
    const checklist = buildChecklist([
      createKeyword("typescript", "TypeScript", "required", 2),
      createKeyword("vue", "Vue", "familiar", 3),
    ]);

    expect(checklist).toEqual([
      { id: "prepare:typescript", label: "复习 TypeScript 核心知识" },
      { id: "prepare:vue", label: "准备 Vue 项目实践案例" },
    ]);
    expect(checklist.every((item) => !Object.hasOwn(item, "noteUrl"))).toBe(true);
  });

  it("sorts by highest tone, count, label, and skill ID", () => {
    const checklist = buildChecklist([
      createKeyword("vue", "Vue", "preferred", 1),
      createKeyword("javascript", "JavaScript", "preferred", 2),
      createKeyword("typescript", "TypeScript", "required", 1),
    ]);

    expect(checklist.map(({ id }) => id)).toEqual([
      "prepare:typescript",
      "prepare:javascript",
      "prepare:vue",
    ]);
  });
});
```

The helper must fill `category`, `contexts`, and `totalWeight` with valid values; `totalWeight` is deliberately irrelevant to checklist ordering.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/build-checklist.test.ts
```

Expected: FAIL because `build-checklist.ts` does not exist.

- [ ] **Step 3: Implement exact-optional-safe checklist building**

Create `build-checklist.ts`:

```ts
export function buildChecklist(
  keywords: readonly AggregatedKeyword[],
): JdChecklistItem[];
```

Resolve each keyword through the dictionary, sort a copy by `compareTones`, count descending, label, then skill ID. Map with conditional spread:

```ts
return definition.noteUrl === undefined
  ? { id: `prepare:${definition.id}`, label: definition.checklistLabel }
  : {
      id: `prepare:${definition.id}`,
      label: definition.checklistLabel,
      noteUrl: definition.noteUrl,
    };
```

Do not emit `noteUrl: undefined`, do not infer URLs, and do not mutate the incoming keyword array.

- [ ] **Step 4: Run GREEN and scoped checks**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/build-checklist.test.ts
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/build-checklist.ts packages/tools/jd-skill-radar/src/domain/build-checklist.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain/build-checklist.ts packages/tools/jd-skill-radar/src/domain/build-checklist.test.ts --check
git diff --check
```

- [ ] **Step 5: Commit checklist building**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/build-checklist.ts packages/tools/jd-skill-radar/src/domain/build-checklist.test.ts
git commit -m "feat(jd-radar): 生成去重准备清单"
```

---

### Task 6: Analysis Pipeline and Cross-Module Fixture

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/analyze-jd.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/analyze-jd.test.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/fixtures/frontend-vue.ts`

**Interfaces:**
- Consumes: `validateInput`、`matchSkills`、`aggregateKeywords`、`extractOverview`、`scoreCategories`、`buildChecklist`。
- Produces: `analyzeJd(text: string): AnalyzeJdResult`。

- [ ] **Step 1: Create an explicit successful-analysis fixture**

Create `fixtures/frontend-vue.ts`:

```ts
export const frontendVueJd = `职位：高级前端开发工程师
工作地点：杭州
支持混合办公
本科及以上学历，3-5 年前端开发经验。
岗位要求：必须熟练掌握 TypeScript，必须具备 TypeScript 工程实践。
必须熟练掌握 Vue 3，熟悉 Vue Router，了解 Pinia。
熟悉 CSS、Sass 和 Tailwind CSS，具备 Vite 与自动化测试经验。
Node.js 经验优先，熟悉 Git 与 Code Review 协作流程。`;
```

The fixture is longer than 80 characters, contains no invented note URL, and exercises language, framework, css, engineering, nodejs, and collaboration.

- [ ] **Step 2: Write failing input-state and successful pipeline tests**

Create `analyze-jd.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzeJd } from "./analyze-jd.ts";
import { frontendVueJd } from "./fixtures/frontend-vue.ts";

describe("analyzeJd", () => {
  it.each([
    ["", "EMPTY"],
    ["Vue", "TOO_SHORT"],
    ["x".repeat(20_001), "TOO_LONG"],
    ["负责客户沟通、合同归档与行政支持。".repeat(8), "NO_SKILLS"],
  ] as const)("returns a non-throwing %s input result", (text, code) => {
    expect(analyzeJd(text)).toMatchObject({ ok: false, error: { code } });
  });

  it("builds one deterministic analysis from raw Task 7 matches", () => {
    const result = analyzeJd(frontendVueJd);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.overview).toMatchObject({
      role: "高级前端开发工程师",
      experience: "3–5 年",
      education: "本科",
      location: "杭州 / 混合办公",
    });
    expect(result.value.overview.primaryFrameworks[0]).toBe("Vue");
    expect(result.value.keywords.find(({ skillId }) => skillId === "typescript")).toMatchObject({
      count: 2,
      tone: "required",
    });
    expect(
      result.value.categories.find(({ category }) => category === "css")?.matchCount,
    ).toBe(3);
    expect(result.value.categories.every(({ score }) => score >= 1 && score <= 100)).toBe(
      true,
    );
    expect(result.value.checklist.every(({ id }) => id.startsWith("prepare:"))).toBe(true);
    expect(result.value.meta).toEqual({
      characterCount: frontendVueJd.length,
      skillCount: result.value.keywords.length,
      categoryCount: result.value.categories.length,
    });
  });

  it("uses 未识别 and an empty framework list when evidence is absent", () => {
    const text = `${"TypeScript 与 Vite 工程实践。".repeat(6)}负责交付与团队沟通。`;
    const result = analyzeJd(text);

    expect(result.ok && result.value.overview).toEqual({
      role: "未识别",
      experience: "未识别",
      education: "未识别",
      location: "未识别",
      primaryFrameworks: [],
    });
  });
});
```

- [ ] **Step 3: Run the focused analysis test and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/analyze-jd.test.ts
```

Expected: FAIL because `analyze-jd.ts` does not exist.

- [ ] **Step 4: Implement the non-throwing pipeline**

Create `analyze-jd.ts`:

```ts
import { aggregateKeywords } from "./aggregate-keywords.ts";
import { buildChecklist } from "./build-checklist.ts";
import { extractOverview } from "./extract-overview.ts";
import { matchSkills } from "./match-skills.ts";
import { scoreCategories } from "./score-categories.ts";
import type { AnalyzeJdResult, JdInputError } from "./types.ts";
import { validateInput } from "./validate-input.ts";

const NO_SKILLS_ERROR = {
  code: "NO_SKILLS",
  message: "没有识别到当前词典支持的前端技能。",
} as const satisfies JdInputError;

export function analyzeJd(text: string): AnalyzeJdResult {
  const inputError = validateInput(text);

  if (inputError !== undefined) {
    return { ok: false, error: inputError };
  }

  const matches = matchSkills(text);

  if (matches.length === 0) {
    return { ok: false, error: NO_SKILLS_ERROR };
  }

  const keywords = aggregateKeywords(matches);
  const categories = scoreCategories(matches);

  return {
    ok: true,
    value: {
      overview: extractOverview(text, keywords),
      categories,
      keywords: keywords.map(({ totalWeight: _totalWeight, ...keyword }) => keyword),
      checklist: buildChecklist(keywords),
      meta: {
        characterCount: text.length,
        skillCount: keywords.length,
        categoryCount: categories.length,
      },
    },
  };
}
```

The underscore binding is intentional and must remain accepted by the repository unused-variable rule. Do not catch internal dictionary contract errors; they are programming defects, not user input states.

- [ ] **Step 5: Run GREEN and package-scoped verification**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/analyze-jd.test.ts
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/analyze-jd.ts packages/tools/jd-skill-radar/src/domain/analyze-jd.test.ts packages/tools/jd-skill-radar/src/domain/fixtures/frontend-vue.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain/analyze-jd.ts packages/tools/jd-skill-radar/src/domain/analyze-jd.test.ts packages/tools/jd-skill-radar/src/domain/fixtures/frontend-vue.ts --check
git diff --check
```

- [ ] **Step 6: Commit the analysis pipeline**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/analyze-jd.ts packages/tools/jd-skill-radar/src/domain/analyze-jd.test.ts packages/tools/jd-skill-radar/src/domain/fixtures/frontend-vue.ts
git commit -m "feat(jd-radar): 串联 JD 分析管线"
```

---

### Task 7: Public Domain Entry and Final Task Gate

**Files:**
- Modify: `packages/tools/jd-skill-radar/src/domain/index.ts`
- Modify: `packages/tools/jd-skill-radar/src/domain/index.test.ts`

**Interfaces:**
- Consumes all Task 8 public contracts and `analyzeJd`。
- Produces package-root exports for Task 9 without loading the lazy Vue component。

- [ ] **Step 1: Extend the package-entry boundary test before exports**

Modify `domain/index.test.ts` imports to include:

```ts
import {
  MAX_JD_LENGTH,
  MIN_JD_LENGTH,
  SKILLS,
  VERIFIED_NOTE_LINKS,
  analyzeJd,
  detectTone,
  jdSkillRadarManifest,
  matchSkills,
} from "../index.ts";
```

Add:

```ts
it("exports the pure Task 8 analysis boundary without loading the Vue component", () => {
  expect(MIN_JD_LENGTH).toBe(80);
  expect(MAX_JD_LENGTH).toBe(20_000);
  expect(analyzeJd("TypeScript 与 Vue 工程实践。".repeat(6))).toMatchObject({ ok: true });
  expect(jdSkillRadarManifest.status).toBe("draft");
});
```

Add type-only imports and a compile-time helper without runtime casts:

```ts
import type { AnalyzeJdResult, JdAnalysis } from "../index.ts";

function acceptAnalysis(_analysis: JdAnalysis): void {}

const exportedResult: AnalyzeJdResult = analyzeJd(
  "TypeScript 与 Vue 工程实践。".repeat(6),
);

if (exportedResult.ok) {
  acceptAnalysis(exportedResult.value);
}
```

Place the `exportedResult` assertion inside the new test so module import has no extra analysis side effect outside test execution.

- [ ] **Step 2: Run the boundary test and verify RED**

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- src/domain/index.test.ts
```

Expected: FAIL because Task 8 symbols are not exported from `domain/index.ts`.

- [ ] **Step 3: Export the Task 8 API**

Append to `domain/index.ts`:

```ts
export { analyzeJd } from "./analyze-jd.ts";
export { MAX_JD_LENGTH, MIN_JD_LENGTH } from "./validate-input.ts";
export type {
  AnalyzeJdResult,
  JdAnalysis,
  JdCategoryScore,
  JdChecklistItem,
  JdInputError,
  JdInputErrorCode,
  JdKeyword,
  JdOverview,
} from "./types.ts";
```

Keep internal helpers (`AggregatedKeyword`, scoring, overview parsing, checklist construction, rules) package-private. `src/index.ts` already re-exports `domain/index.ts` and requires no change.

- [ ] **Step 4: Run one final Task 8 package gate**

Run each once from the isolated Task 8 worktree:

```powershell
$env:CI = "true"
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src --check
git diff --check main...HEAD
node -e "import('@kunlun/jd-skill-radar').then(({ analyzeJd }) => console.log(analyzeJd('TypeScript 与 Vue 工程实践。'.repeat(6)).ok))"
```

Expected: frozen install exits 0; all JD package tests, typecheck, lint and format pass; Node prints `true` without executing `jdSkillRadarManifest.component()`.

Do not run root `pnpm test`, `pnpm validate`, production build, browser tests, or visual tests for this pure-domain task.

- [ ] **Step 5: Audit exact Task 8 scope and history**

```powershell
rg -n "fetch\(|localStorage|sessionStorage|toMarkdown|clipboard|download|interview-notes" packages/tools/jd-skill-radar/src/domain
rg -n "\bany\b" packages/tools/jd-skill-radar/src/domain
git log --oneline main..HEAD
git rev-list --merges main..HEAD
git status --short
git check-ignore -v AGENTS.override.md
```

Expected: no network, persistence, export, guessed knowledge-base coupling, authored `any`, merge commits, mutation residue, or tracked override. The feature branch contains only Task 8 domain commits; the confirmed design and this plan are already part of its `main` base.

- [ ] **Step 6: Commit the public boundary**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/index.ts packages/tools/jd-skill-radar/src/domain/index.test.ts
git commit -m "feat(jd-radar): 导出 JD 分析接口"
```

- [ ] **Step 7: Request independent final review**

Review the confirmed design, this plan, all Task 8 commits, mutation evidence, and complete `main...HEAD` diff. Require:

- no open P0–P2;
- exact input boundaries and stable error codes/messages;
- per-occurrence scoring rather than per-skill scoring;
- CSS/Sass category correction without unrelated dictionary edits;
- conservative overview extraction and `未识别` fallbacks;
- stable keyword/category/checklist ordering;
- no Task 9, UI, dependency, network, storage, or knowledge-base scope expansion;
- linear history and local Git identity `风岚 <1837115857@qq.com>`.

Only after approval may Sol apply the established local `git merge --ff-only` policy. Run one merged-result JD package test, then clean up only the Task 8 worktree and merged feature branch. Do not push.

---

## Self-Review Record

- **Spec coverage:** Task 1 covers contracts, weights and input states; Task 2 covers CSS/Sass correction and canonical aggregation; Task 3 covers repeated-occurrence category scoring; Task 4 covers all conservative overview fields and framework ranking; Task 5 covers stable checklist output; Task 6 covers the full analysis result and metadata; Task 7 covers public exports, final package evidence and linear integration readiness.
- **Dependency order:** Tasks execute strictly `1 → 2 → 3 → 4 → 5 → 6 → 7`. Aggregation depends on rules and types; overview/checklist depend on aggregation; the pipeline depends on every pure unit; exports come last.
- **Type consistency:** `JdInputErrorCode`, `JdInputError`, `JdOverview`, `JdCategoryScore`, `JdKeyword`, `JdChecklistItem`, `JdAnalysis`, `AnalyzeJdResult`, `AggregatedKeyword`, `getSkillDefinition`, `analyzeJd`, `MIN_JD_LENGTH` and `MAX_JD_LENGTH` keep identical names and shapes across tasks.
- **Determinism:** Every output has explicit ordering and fixed messages; no task uses time, randomness, network, filesystem discovery, browser persistence or inferred relationships.
- **Scope:** No Markdown export, state machine, Vue workbench, manifest publication, dependency update, full repository test, production build or `interview-notes` mutation is included.
- **Validation discipline:** Each production unit has one RED/GREEN; only repeated-occurrence scoring has a mutation probe; the full JD package gate runs once at the public-boundary task.
