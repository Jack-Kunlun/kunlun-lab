# Task 9 JD Export and Workbench State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 JD 技能雷达增加确定性 Markdown 导出、隔离的浏览器复制/下载适配器，以及可供 Task 10 Vue 工作台直接消费的响应式状态机。

**Architecture:** `toMarkdown` 保持为只消费 `JdAnalysis` 的纯函数；Clipboard 与 Blob/Object URL 分别封装为浏览器适配器；`useJdRadar` 使用 Vue refs 管理状态，并通过可选依赖注入替换分析、复制和下载端口。Task 9 不实现 Vue 组件，也不修改 manifest 状态或 capabilities。

**Tech Stack:** TypeScript 6、Vue 3.5 refs、Vitest 4、happy-dom、pnpm workspace、严格 ESLint、Prettier。

## Global Constraints

- 使用 TypeScript，禁止显式或隐式 `any`；所有新增代码通过严格 typecheck 和 ESLint。
- 使用双引号、分号和 LF；不得增加局部 ESLint/Prettier 豁免。
- Markdown 不包含完整 JD，也不包含 `JdKeyword.contexts` 中的原文片段。
- 不重新匹配、重新评分、重新抽取概览或推断知识库链接。
- 不使用网络、localStorage、IndexedDB、Cookie、遥测或第三方复制/下载降级。
- manifest 保持 `draft` 且 capabilities 为空；本任务不修改 `manifest.ts`。
- stale 保留旧分析和旧勾选；任意成功重分析清空勾选；typed input error 清空旧结果与勾选。
- 复制/下载错误只更新安全反馈，不改变 `ready` / `stale` 状态；只有分析器意外异常进入 `failed`。
- 固定下载文件名为 `jd-skill-radar.md`，不从 JD 内容拼接。
- 最终只运行 JD 包测试、包 typecheck、Task 9 作用域 lint/format、`git diff --check` 和包根导入探针；不运行根测试、生产构建、E2E 或视觉测试。
- Git 身份必须为 `风岚 <1837115857@qq.com>`；提交消息的 type/scope 使用英文，描述优先中文。

## File Structure

- `src/domain/to-markdown.ts`：纯 Markdown 序列化、标签映射和内联转义。
- `src/domain/to-markdown.test.ts`：格式、隐私、顺序、链接、勾选和确定性测试。
- `src/browser/copy-markdown.ts`：Clipboard API 能力检测与复制。
- `src/browser/download-markdown.ts`：Blob、临时链接、点击和清理。
- `src/browser/browser-adapters.test.ts`：happy-dom 中验证两个浏览器边界。
- `src/state/types.ts`：状态、反馈、端口、快照和公开返回接口。
- `src/state/useJdRadar.ts`：响应式状态机与默认端口组合。
- `src/state/useJdRadar.test.ts`：分析生命周期、stale、invalid、failed、retry 和 reset。
- `src/state/useJdRadar.export.test.ts`：勾选、复制、下载与反馈。
- `src/domain/index.ts`、`src/domain/index.test.ts`：追加纯领域导出并保护既有 API。
- `src/index.ts`、`src/index.test.ts`：追加浏览器/状态导出并保护包根边界。

---

### Task 1: Deterministic Markdown Serialization

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/to-markdown.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/to-markdown.test.ts`

**Interfaces:**
- Consumes: `JdAnalysis`, `SkillCategory`, `RequirementTone`, `ReadonlySet<string>`。
- Produces: `toMarkdown(analysis: JdAnalysis, checkedIds: ReadonlySet<string>): string`。

- [ ] **Step 1: Write the representative analysis fixture and failing format test**

Create a fully typed fixture in `to-markdown.test.ts`. Use a context marker that must never appear in output:

```ts
import { describe, expect, it } from "vitest";
import { toMarkdown } from "./to-markdown.ts";
import type { JdAnalysis } from "./types.ts";

const analysis: JdAnalysis = {
  overview: {
    role: "高级前端开发工程师",
    experience: "3–5 年",
    education: "本科",
    location: "杭州 / 混合办公",
    primaryFrameworks: ["Vue"],
  },
  categories: [
    { category: "language", score: 100, matchCount: 2 },
    { category: "framework", score: 50, matchCount: 1 },
  ],
  keywords: [
    {
      skillId: "typescript",
      label: "TypeScript",
      category: "language",
      count: 2,
      tone: "required",
      contexts: ["敏感 JD 原文片段"],
    },
    {
      skillId: "vue",
      label: "Vue",
      category: "framework",
      count: 1,
      tone: "familiar",
      contexts: [],
    },
  ],
  checklist: [
    { id: "prepare:typescript", label: "复习 TypeScript 核心知识" },
    {
      id: "prepare:vue",
      label: "准备 Vue 项目实践案例",
      noteUrl: "https://www.kunlunmarket.work/vue",
    },
  ],
  meta: { characterCount: 240, skillCount: 2, categoryCount: 2 },
};

describe("toMarkdown", () => {
  it("serializes the approved sections in a deterministic order", () => {
    const markdown = toMarkdown(analysis, new Set(["prepare:typescript"]));

    expect(markdown).toBe(`# 前端岗位 JD 技能雷达

## 岗位概览
- 岗位：高级前端开发工程师
- 经验：3–5 年
- 学历：本科
- 地点或工作方式：杭州 / 混合办公
- 主要框架：Vue

## 技能分布
- 语言：100 / 100（2 次命中）
- 框架：50 / 100（1 次命中）

## 关键词明细
- TypeScript｜语言｜2 次｜必须
- Vue｜框架｜1 次｜熟悉

## 准备清单
- [x] 复习 TypeScript 核心知识
- [ ] [准备 Vue 项目实践案例](https://www.kunlunmarket.work/vue)

> 分值仅表示当前 JD 文本的强调程度，不代表岗位好坏、用户能力或面试结果。
`);
  });
});
```

- [ ] **Step 2: Add failing privacy, fallback, escaping, and determinism tests**

Add these focused cases before implementation:

```ts
it("does not export JD context fragments", () => {
  const markdown = toMarkdown(analysis, new Set());

  expect(markdown).not.toContain("敏感 JD 原文片段");
  expect(markdown).not.toContain("contexts");
});

it("uses 未识别 and preserves safe markdown structure", () => {
  const special: JdAnalysis = {
    ...analysis,
    overview: {
      role: "未识别",
      experience: "未识别",
      education: "未识别",
      location: "未识别",
      primaryFrameworks: [],
    },
    checklist: [
      {
        id: "prepare:special",
        label: "复习 [特殊] *内容*",
        noteUrl: "https://example.com/a_(b)",
      },
    ],
  };

  const markdown = toMarkdown(special, new Set());

  expect(markdown).toContain("- 主要框架：未识别");
  expect(markdown).toContain(
    "- [ ] [复习 \\[特殊\\] \\*内容\\*](https://example.com/a_%28b%29)",
  );
  expect(toMarkdown(special, new Set())).toBe(markdown);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run from the package directory using the worktree-local binary:

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/domain/to-markdown.test.ts
```

Expected: FAIL because `to-markdown.ts` does not exist.

- [ ] **Step 4: Implement label maps and safe inline rendering**

Create `to-markdown.ts` with complete category/tone maps and private helpers:

```ts
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

const DISCLAIMER =
  "> 分值仅表示当前 JD 文本的强调程度，不代表岗位好坏、用户能力或面试结果。";

function escapeInline(value: string): string {
  return value
    .replace(/\r?\n|\r/g, " ")
    .replace(/([\\`*_[\]<>#])/g, "\\$1");
}

function escapeLinkDestination(value: string): string {
  return encodeURI(value).replaceAll("(", "%28").replaceAll(")", "%29");
}
```

Do not export these helpers or maps.

- [ ] **Step 5: Implement deterministic section builders**

Build sections with `map` and `join`, preserving the arrays' existing order:

```ts
export function toMarkdown(
  analysis: JdAnalysis,
  checkedIds: ReadonlySet<string>,
): string {
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
        `- ${CATEGORY_LABELS[category]}：${score} / 100（${matchCount} 次命中）`,
    )
    .join("\n");
  const keywords = analysis.keywords
    .map(
      ({ label, category, count, tone }) =>
        `- ${escapeInline(label)}｜${CATEGORY_LABELS[category]}｜${count} 次｜${TONE_LABELS[tone]}`,
    )
    .join("\n");
  const checklist = analysis.checklist
    .map((item) => {
      const marker = checkedIds.has(item.id) ? "x" : " ";
      const label = escapeInline(item.label);
      const content =
        item.noteUrl === undefined
          ? label
          : `[${label}](${escapeLinkDestination(item.noteUrl)})`;

      return `- [${marker}] ${content}`;
    })
    .join("\n");

  return `# 前端岗位 JD 技能雷达\n\n## 岗位概览\n${overview}\n\n## 技能分布\n${categories}\n\n## 关键词明细\n${keywords}\n\n## 准备清单\n${checklist}\n\n${DISCLAIMER}\n`;
}
```

- [ ] **Step 6: Run GREEN and scoped checks**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/domain/to-markdown.test.ts
..\..\..\node_modules\.bin\eslint.cmd src/domain/to-markdown.ts src/domain/to-markdown.test.ts --max-warnings 0
..\..\..\node_modules\.bin\prettier.cmd src/domain/to-markdown.ts src/domain/to-markdown.test.ts --check
git diff --check
```

Expected: focused tests pass; no lint, formatting, or whitespace errors.

- [ ] **Step 7: Commit the serializer**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/to-markdown.ts packages/tools/jd-skill-radar/src/domain/to-markdown.test.ts
git commit -m "feat(jd-radar): 添加本地 Markdown 导出"
```

---

### Task 2: Clipboard and Download Browser Adapters

**Files:**
- Create: `packages/tools/jd-skill-radar/src/browser/copy-markdown.ts`
- Create: `packages/tools/jd-skill-radar/src/browser/download-markdown.ts`
- Create: `packages/tools/jd-skill-radar/src/browser/browser-adapters.test.ts`

**Interfaces:**
- Produces: `copyMarkdown(markdown: string): Promise<void>`。
- Produces: `downloadMarkdown(markdown: string, filename: string): void`。
- Throws ordinary internal errors when required browser capabilities are absent or fail; state code converts them to safe UI feedback.

- [ ] **Step 1: Write failing Clipboard tests**

Use happy-dom and restore all globals after each test:

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyMarkdown } from "./copy-markdown.ts";
import { downloadMarkdown } from "./download-markdown.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("copyMarkdown", () => {
  it("writes the exact Markdown through Clipboard API", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyMarkdown("# 分析结果");

    expect(writeText).toHaveBeenCalledExactlyOnceWith("# 分析结果");
  });

  it("rejects when Clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(copyMarkdown("# 分析结果")).rejects.toThrow("Clipboard API is unavailable.");
  });
});
```

- [ ] **Step 2: Write failing download lifecycle tests**

Add exact Blob, filename, click, removal, and revocation assertions:

```ts
describe("downloadMarkdown", () => {
  it("downloads a Markdown Blob and always cleans the temporary URL", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>().mockReturnValue("blob:jd-result");
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadMarkdown("# 分析结果", "jd-skill-radar.md");

    const blob = createObjectURL.mock.calls[0]?.[0];

    if (blob === undefined) {
      throw new Error("Expected a Markdown Blob.");
    }

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    await expect(blob.text()).resolves.toBe("# 分析结果");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:jd-result");
    expect(document.querySelector("a")).toBeNull();
  });

  it("revokes the URL and removes the anchor when click throws", () => {
    const revokeObjectURL = vi.fn<(url: string) => void>();

    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:jd-result",
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => downloadMarkdown("# 分析结果", "jd-skill-radar.md")).toThrow("blocked");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:jd-result");
    expect(document.querySelector("a")).toBeNull();
  });
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/browser/browser-adapters.test.ts
```

Expected: FAIL because the two adapter modules do not exist.

- [ ] **Step 4: Implement the Clipboard adapter**

```ts
export async function copyMarkdown(markdown: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;

  if (clipboard === undefined || typeof clipboard.writeText !== "function") {
    throw new Error("Clipboard API is unavailable.");
  }

  await clipboard.writeText(markdown);
}
```

- [ ] **Step 5: Implement the download adapter with `finally` cleanup**

```ts
export function downloadMarkdown(markdown: string, filename: string): void {
  if (
    typeof globalThis.document === "undefined" ||
    typeof globalThis.Blob === "undefined" ||
    typeof globalThis.URL?.createObjectURL !== "function" ||
    typeof globalThis.URL.revokeObjectURL !== "function"
  ) {
    throw new Error("Download API is unavailable.");
  }

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(blob);

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 6: Run GREEN and scoped checks**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/browser/browser-adapters.test.ts
..\..\..\node_modules\.bin\eslint.cmd src/browser --max-warnings 0
..\..\..\node_modules\.bin\prettier.cmd src/browser --check
git diff --check
```

- [ ] **Step 7: Commit the browser adapters**

```powershell
git add -- packages/tools/jd-skill-radar/src/browser
git commit -m "feat(jd-radar): 隔离复制与下载适配器"
```

---

### Task 3: Complete Workbench State Machine

**Files:**
- Create: `packages/tools/jd-skill-radar/src/state/types.ts`
- Create: `packages/tools/jd-skill-radar/src/state/useJdRadar.ts`
- Create: `packages/tools/jd-skill-radar/src/state/useJdRadar.test.ts`
- Create: `packages/tools/jd-skill-radar/src/state/useJdRadar.export.test.ts`

**Interfaces:**
- Consumes: `analyzeJd`, `AnalyzeJdResult`, `JdAnalysis`, browser adapter ports。
- Produces: complete `useJdRadar(options?: UseJdRadarOptions): JdRadarController` and all public state/feedback/port types。

- [ ] **Step 1: Define the test-only analysis fixtures**

In `useJdRadar.test.ts`, create a valid input longer than 80 UTF-16 code units, one complete `JdAnalysis`, and helpers returning typed success/error results. Do not use assertions or `any`:

```ts
import { describe, expect, it, vi } from "vitest";
import { useJdRadar } from "./useJdRadar.ts";
import type { AnalyzeJdResult, JdAnalysis, JdInputErrorCode } from "../domain/types.ts";

const validJd = "TypeScript 与 Vue 工程实践，负责前端工程化、性能优化和团队协作。".repeat(3);
const analysis: JdAnalysis = {
  overview: {
    role: "前端工程师",
    experience: "未识别",
    education: "未识别",
    location: "未识别",
    primaryFrameworks: ["Vue"],
  },
  categories: [{ category: "language", score: 100, matchCount: 1 }],
  keywords: [
    {
      skillId: "typescript",
      label: "TypeScript",
      category: "language",
      count: 1,
      tone: "required",
      contexts: [],
    },
  ],
  checklist: [{ id: "prepare:typescript", label: "复习 TypeScript 核心知识" }],
  meta: { characterCount: validJd.length, skillCount: 1, categoryCount: 1 },
};

const successResult: AnalyzeJdResult = { ok: true, value: analysis };

function errorResult(code: JdInputErrorCode, message: string): AnalyzeJdResult {
  return { ok: false, error: { code, message } };
}
```

- [ ] **Step 2: Write failing ready, stale, invalid, failed, retry, and reset tests**

Add explicit state transition tests:

```ts
it("exposes analyzing before a synchronous success becomes ready", async () => {
  const radar = useJdRadar({ analyze: () => successResult });

  radar.setInput(validJd);
  const pending = radar.analyze();

  expect(radar.status.value).toBe("analyzing");

  await pending;

  expect(radar.status.value).toBe("ready");
  expect(radar.analysis.value).toEqual(analysis);
});

it("keeps the prior result and checked IDs when input becomes stale", async () => {
  const radar = useJdRadar({ analyze: () => successResult });

  radar.setInput(validJd);
  await radar.analyze();
  radar.toggleChecklist("prepare:typescript");
  radar.setInput(`${validJd}\n新增要求：熟悉 Docker`);

  expect(radar.status.value).toBe("stale");
  expect(radar.analysis.value).toEqual(analysis);
  expect([...radar.checkedIds.value]).toEqual(["prepare:typescript"]);
});

it.each([
  ["EMPTY", "请粘贴一份前端岗位 JD。"],
  ["TOO_SHORT", "JD 内容过短，请提供更完整的岗位描述。"],
  ["TOO_LONG", "JD 内容超过 20,000 个字符，请缩短后重试。"],
  ["NO_SKILLS", "没有识别到当前词典支持的前端技能。"],
] as const)("clears stale output for %s", async (code, message) => {
  const analyze = vi
    .fn<(text: string) => AnalyzeJdResult>()
    .mockReturnValueOnce(successResult)
    .mockReturnValueOnce(errorResult(code, message));
  const radar = useJdRadar({ analyze });

  radar.setInput(validJd);
  await radar.analyze();
  radar.toggleChecklist("prepare:typescript");
  radar.setInput("bad input");
  await radar.analyze();

  expect(radar.snapshot()).toEqual({
    input: "bad input",
    status: "invalid",
    analysis: null,
    checkedIds: [],
    feedback: { code, kind: "error", message },
  });
});

it("uses the latest input for retry after an unexpected failure", async () => {
  const analyze = vi
    .fn<(text: string) => AnalyzeJdResult>()
    .mockImplementationOnce(() => {
      throw new Error("internal marker");
    })
    .mockReturnValueOnce(successResult);
  const radar = useJdRadar({ analyze });

  radar.setInput(validJd);
  await radar.analyze();

  expect(radar.status.value).toBe("failed");
  expect(radar.feedback.value).toEqual({
    code: "ANALYSIS_FAILED",
    kind: "error",
    message: "分析失败，请重试",
  });

  radar.setInput(`${validJd}\n最新输入`);
  await radar.retry();

  expect(analyze).toHaveBeenLastCalledWith(`${validJd}\n最新输入`);
  expect(radar.status.value).toBe("ready");
});

it("reset removes input, result, checked state, and feedback", async () => {
  const radar = useJdRadar({ analyze: () => successResult });

  radar.setInput(validJd);
  await radar.analyze();
  radar.toggleChecklist("prepare:typescript");
  radar.reset();

  expect(radar.snapshot()).toEqual({
    input: "",
    status: "idle",
    analysis: null,
    checkedIds: [],
    feedback: null,
  });
});
```

- [ ] **Step 3: Add an obsolete async result test**

Because the approved analyze port accepts promises, prevent an old result from overwriting newer input:

```ts
it("ignores an analysis result when input changes before it settles", async () => {
  const analyze = vi
    .fn<(text: string) => Promise<AnalyzeJdResult>>()
    .mockResolvedValue(successResult);
  const radar = useJdRadar({ analyze });

  radar.setInput(validJd);
  const pending = radar.analyze();
  radar.setInput(`${validJd}\n已修改`);
  await pending;

  expect(radar.status.value).toBe("idle");
  expect(radar.analysis.value).toBeNull();
});

it("ignores an older run when the same input is analyzed twice", async () => {
  const first = Promise.withResolvers<AnalyzeJdResult>();
  const second = Promise.withResolvers<AnalyzeJdResult>();
  const analyze = vi
    .fn<(text: string) => Promise<AnalyzeJdResult>>()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const radar = useJdRadar({ analyze });

  radar.setInput(validJd);
  const firstPending = radar.analyze();
  const secondPending = radar.analyze();
  second.resolve(successResult);
  await secondPending;
  first.reject(new Error("obsolete marker"));
  await firstPending;

  expect(radar.status.value).toBe("ready");
  expect(radar.analysis.value).toEqual(analysis);
  expect(radar.feedback.value).toBeNull();
});
```

- [ ] **Step 4: Run the focused test and verify RED**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/state/useJdRadar.test.ts
```

Expected: FAIL because `useJdRadar.ts` does not exist.

- [ ] **Step 5: Define the state and dependency contracts**

Create `state/types.ts`:

```ts
import type { ComputedRef, DeepReadonly } from "vue";
import type { AnalyzeJdResult, JdAnalysis, JdInputErrorCode } from "../domain/types.ts";

export type JdRadarStatus = "idle" | "analyzing" | "ready" | "stale" | "invalid" | "failed";
export type JdRadarFeedbackCode =
  | JdInputErrorCode
  | "ANALYSIS_FAILED"
  | "EXPORT_UNAVAILABLE"
  | "COPY_SUCCESS"
  | "COPY_STALE_SUCCESS"
  | "COPY_FAILED"
  | "DOWNLOAD_SUCCESS"
  | "DOWNLOAD_STALE_SUCCESS"
  | "DOWNLOAD_FAILED";
export type JdRadarFeedbackKind = "success" | "warning" | "error";

export interface JdRadarFeedback {
  code: JdRadarFeedbackCode;
  kind: JdRadarFeedbackKind;
  message: string;
}

export interface JdRadarDependencies {
  analyze: (text: string) => AnalyzeJdResult | Promise<AnalyzeJdResult>;
  copy: (markdown: string) => Promise<void>;
  download: (markdown: string, filename: string) => void | Promise<void>;
}

export type UseJdRadarOptions = Partial<JdRadarDependencies>;

export interface JdRadarSnapshot {
  input: string;
  status: JdRadarStatus;
  analysis: JdAnalysis | null;
  checkedIds: string[];
  feedback: JdRadarFeedback | null;
}

export interface JdRadarController {
  input: ComputedRef<string>;
  status: ComputedRef<JdRadarStatus>;
  analysis: ComputedRef<DeepReadonly<JdAnalysis> | null>;
  checkedIds: ComputedRef<ReadonlySet<string>>;
  feedback: ComputedRef<JdRadarFeedback | null>;
  setInput: (value: string) => void;
  analyze: () => Promise<void>;
  retry: () => Promise<void>;
  toggleChecklist: (id: string) => void;
  copyMarkdown: () => Promise<void>;
  downloadMarkdown: () => Promise<void>;
  reset: () => void;
  snapshot: () => JdRadarSnapshot;
}
```

- [ ] **Step 6: Implement lifecycle transitions and stale-run protection**

Create `useJdRadar.ts`, importing defaults with aliases. The core must follow this exact flow:

```ts
import { computed, ref, shallowRef } from "vue";
import { copyMarkdown as copyMarkdownAdapter } from "../browser/copy-markdown.ts";
import { downloadMarkdown as downloadMarkdownAdapter } from "../browser/download-markdown.ts";
import { analyzeJd } from "../domain/analyze-jd.ts";
import type { JdAnalysis } from "../domain/types.ts";
import type {
  JdRadarController,
  JdRadarFeedback,
  JdRadarStatus,
  UseJdRadarOptions,
} from "./types.ts";

const ANALYSIS_FAILED: JdRadarFeedback = Object.freeze({
  code: "ANALYSIS_FAILED",
  kind: "error",
  message: "分析失败，请重试",
});

export function useJdRadar(options: UseJdRadarOptions = {}): JdRadarController {
  const analyzePort = options.analyze ?? analyzeJd;
  const copyPort = options.copy ?? copyMarkdownAdapter;
  const downloadPort = options.download ?? downloadMarkdownAdapter;
  const input = ref("");
  const status = ref<JdRadarStatus>("idle");
  const analysis = shallowRef<JdAnalysis | null>(null);
  const checkedIds = shallowRef<ReadonlySet<string>>(new Set());
  const feedback = shallowRef<JdRadarFeedback | null>(null);
  let inputVersion = 0;
  let analysisRunVersion = 0;

  function setInput(value: string): void {
    if (input.value === value) {
      return;
    }

    inputVersion += 1;
    input.value = value;
    feedback.value = null;
    status.value = analysis.value === null ? "idle" : "stale";
  }

  async function analyze(): Promise<void> {
    const analyzedInput = input.value;
    const analyzedVersion = inputVersion;
    const runVersion = analysisRunVersion + 1;

    analysisRunVersion = runVersion;

    feedback.value = null;
    status.value = "analyzing";

    try {
      const result = await analyzePort(analyzedInput);

      if (runVersion !== analysisRunVersion) {
        return;
      }

      if (analyzedVersion !== inputVersion) {
        status.value = analysis.value === null ? "idle" : "stale";
        return;
      }

      if (!result.ok) {
        analysis.value = null;
        checkedIds.value = new Set();
        status.value = "invalid";
        feedback.value = { ...result.error, kind: "error" };
        return;
      }

      analysis.value = result.value;
      checkedIds.value = new Set();
      status.value = "ready";
    } catch (_error: unknown) {
      if (runVersion !== analysisRunVersion) {
        return;
      }

      if (analyzedVersion !== inputVersion) {
        status.value = analysis.value === null ? "idle" : "stale";
        return;
      }

      analysis.value = null;
      checkedIds.value = new Set();
      status.value = "failed";
      feedback.value = ANALYSIS_FAILED;
    }
  }
```

Complete `retry`, `reset`, and `snapshot` in the same task:

```ts
function retry(): Promise<void> {
  return analyze();
}

function reset(): void {
  inputVersion += 1;
  analysisRunVersion += 1;
  input.value = "";
  status.value = "idle";
  analysis.value = null;
  checkedIds.value = new Set();
  feedback.value = null;
}

function snapshot() {
  return {
    input: input.value,
    status: status.value,
    analysis: analysis.value,
    checkedIds: [...checkedIds.value],
    feedback: feedback.value,
  };
}
```

- [ ] **Step 7: Create computed read-only views**

Create computed read-only views so callers cannot assign `.value`, while snapshots retain the existing `JdAnalysis` type without casts. Do not write the controller `return` yet; Step 14 adds it after all action functions exist.

```ts
const publicInput = computed(() => input.value);
const publicStatus = computed(() => status.value);
const publicAnalysis = computed<DeepReadonly<JdAnalysis> | null>(() => analysis.value);
const publicCheckedIds = computed<ReadonlySet<string>>(() => new Set(checkedIds.value));
const publicFeedback = computed(() => feedback.value);
```

Do not run lint or typecheck against the incomplete module. Continue without committing; Steps 8–14 add every action and the final return before this task's first GREEN gate.

- [ ] **Step 8: Write failing checklist replacement and reanalysis tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { useJdRadar } from "./useJdRadar.ts";
import type { AnalyzeJdResult, JdAnalysis } from "../domain/types.ts";

const validJd = "TypeScript 与 Vue 工程实践，负责前端工程化、性能优化和团队协作。".repeat(3);
const analysis: JdAnalysis = {
  overview: {
    role: "前端工程师",
    experience: "未识别",
    education: "未识别",
    location: "未识别",
    primaryFrameworks: ["Vue"],
  },
  categories: [{ category: "language", score: 100, matchCount: 1 }],
  keywords: [
    {
      skillId: "typescript",
      label: "TypeScript",
      category: "language",
      count: 1,
      tone: "required",
      contexts: [],
    },
  ],
  checklist: [{ id: "prepare:typescript", label: "复习 TypeScript 核心知识" }],
  meta: { characterCount: validJd.length, skillCount: 1, categoryCount: 1 },
};
const successResult: AnalyzeJdResult = { ok: true, value: analysis };

it("toggles only checklist IDs in the current analysis", async () => {
  const radar = useJdRadar({ analyze: () => successResult });

  radar.setInput(validJd);
  await radar.analyze();
  radar.toggleChecklist("missing");
  radar.toggleChecklist("prepare:typescript");

  expect([...radar.checkedIds.value]).toEqual(["prepare:typescript"]);

  radar.toggleChecklist("prepare:typescript");

  expect([...radar.checkedIds.value]).toEqual([]);
});

it("clears checked IDs after every successful reanalysis", async () => {
  const radar = useJdRadar({ analyze: () => successResult });

  radar.setInput(validJd);
  await radar.analyze();
  radar.toggleChecklist("prepare:typescript");
  await radar.analyze();

  expect(radar.status.value).toBe("ready");
  expect([...radar.checkedIds.value]).toEqual([]);
});
```

- [ ] **Step 9: Write failing ready/stale copy and download tests**

Inject spies and assert exact Markdown and filename:

```ts
it("copies ready output and reports success", async () => {
  const copy = vi.fn<(markdown: string) => Promise<void>>().mockResolvedValue();
  const radar = useJdRadar({ analyze: () => successResult, copy });

  radar.setInput(validJd);
  await radar.analyze();
  await radar.copyMarkdown();

  expect(copy).toHaveBeenCalledOnce();
  expect(copy.mock.calls[0]?.[0]).toContain("# 前端岗位 JD 技能雷达");
  expect(radar.feedback.value).toEqual({
    code: "COPY_SUCCESS",
    kind: "success",
    message: "已复制 Markdown",
  });
});

it("exports the retained analysis from stale state with a warning", async () => {
  const download = vi.fn<(markdown: string, filename: string) => void>();
  const radar = useJdRadar({ analyze: () => successResult, download });

  radar.setInput(validJd);
  await radar.analyze();
  radar.setInput(`${validJd}\n尚未分析的新内容`);
  await radar.downloadMarkdown();

  expect(download.mock.calls[0]?.[1]).toBe("jd-skill-radar.md");
  expect(download.mock.calls[0]?.[0]).not.toContain("尚未分析的新内容");
  expect(radar.status.value).toBe("stale");
  expect(radar.feedback.value).toEqual({
    code: "DOWNLOAD_STALE_SUCCESS",
    kind: "warning",
    message: "已下载过期结果的 Markdown",
  });
});
```

- [ ] **Step 10: Write failing adapter-error and unavailable tests**

```ts
it("keeps ready state when copy fails", async () => {
  const copy = vi.fn<(markdown: string) => Promise<void>>().mockRejectedValue(new Error("marker"));
  const radar = useJdRadar({ analyze: () => successResult, copy });

  radar.setInput(validJd);
  await radar.analyze();
  await radar.copyMarkdown();

  expect(radar.status.value).toBe("ready");
  expect(radar.analysis.value).toEqual(analysis);
  expect(radar.feedback.value).toEqual({
    code: "COPY_FAILED",
    kind: "error",
    message: "复制失败，请重试",
  });
});

it("reports unavailable export without calling adapters", async () => {
  const copy = vi.fn<(markdown: string) => Promise<void>>();
  const radar = useJdRadar({ copy });

  await radar.copyMarkdown();

  expect(copy).not.toHaveBeenCalled();
  expect(radar.feedback.value).toEqual({
    code: "EXPORT_UNAVAILABLE",
    kind: "error",
    message: "暂无可导出的分析结果",
  });
});
```

Add the symmetric download failure as an explicit test:

```ts
it("keeps stale state and analysis when download fails", async () => {
  const download = vi
    .fn<(markdown: string, filename: string) => void>()
    .mockImplementation(() => {
      throw new Error("marker");
    });
  const radar = useJdRadar({ analyze: () => successResult, download });

  radar.setInput(validJd);
  await radar.analyze();
  radar.setInput(`${validJd}\n未分析变更`);
  await radar.downloadMarkdown();

  expect(radar.status.value).toBe("stale");
  expect(radar.analysis.value).toEqual(analysis);
  expect(radar.feedback.value).toEqual({
    code: "DOWNLOAD_FAILED",
    kind: "error",
    message: "下载失败，请重试",
  });
});
```

- [ ] **Step 11: Run focused tests and verify RED**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/state/useJdRadar.export.test.ts
```

Expected: FAIL because the three action functions are not implemented.

- [ ] **Step 12: Implement immutable checklist toggling**

```ts
function toggleChecklist(id: string): void {
  const currentAnalysis = analysis.value;

  feedback.value = null;

  if (
    currentAnalysis === null ||
    !currentAnalysis.checklist.some((item) => item.id === id)
  ) {
    return;
  }

  const next = new Set(checkedIds.value);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  checkedIds.value = next;
}
```

- [ ] **Step 13: Implement export guards and exact feedback constants**

Add frozen feedback objects for unavailable/success/stale/failure. Use a private guard:

```ts
import { toMarkdown } from "../domain/to-markdown.ts";

const MARKDOWN_FILENAME = "jd-skill-radar.md";
const EXPORT_UNAVAILABLE: JdRadarFeedback = Object.freeze({
  code: "EXPORT_UNAVAILABLE",
  kind: "error",
  message: "暂无可导出的分析结果",
});
const COPY_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "COPY_SUCCESS",
  kind: "success",
  message: "已复制 Markdown",
});
const COPY_STALE_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "COPY_STALE_SUCCESS",
  kind: "warning",
  message: "已复制过期结果的 Markdown",
});
const COPY_FAILED: JdRadarFeedback = Object.freeze({
  code: "COPY_FAILED",
  kind: "error",
  message: "复制失败，请重试",
});
const DOWNLOAD_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_SUCCESS",
  kind: "success",
  message: "已下载 Markdown",
});
const DOWNLOAD_STALE_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_STALE_SUCCESS",
  kind: "warning",
  message: "已下载过期结果的 Markdown",
});
const DOWNLOAD_FAILED: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_FAILED",
  kind: "error",
  message: "下载失败，请重试",
});

function getExportContext():
  | { analysis: JdAnalysis; stale: boolean }
  | undefined {
  if (
    analysis.value === null ||
    (status.value !== "ready" && status.value !== "stale")
  ) {
    feedback.value = EXPORT_UNAVAILABLE;
    return undefined;
  }

  return { analysis: analysis.value, stale: status.value === "stale" };
}
```

Implement actions without changing `status`:

```ts
async function copyMarkdown(): Promise<void> {
  feedback.value = null;
  const context = getExportContext();

  if (context === undefined) {
    return;
  }

  try {
    await copyPort(toMarkdown(context.analysis, checkedIds.value));
    feedback.value = context.stale ? COPY_STALE_SUCCESS : COPY_SUCCESS;
  } catch (_error: unknown) {
    feedback.value = COPY_FAILED;
  }
}

async function downloadMarkdown(): Promise<void> {
  feedback.value = null;
  const context = getExportContext();

  if (context === undefined) {
    return;
  }

  try {
    await downloadPort(
      toMarkdown(context.analysis, checkedIds.value),
      MARKDOWN_FILENAME,
    );
    feedback.value = context.stale ? DOWNLOAD_STALE_SUCCESS : DOWNLOAD_SUCCESS;
  } catch (_error: unknown) {
    feedback.value = DOWNLOAD_FAILED;
  }
}
```

- [ ] **Step 14: Return the controller and run the complete state-machine GREEN**

After all functions exist, return the controller:

```ts
return {
  input: publicInput,
  status: publicStatus,
  analysis: publicAnalysis,
  checkedIds: publicCheckedIds,
  feedback: publicFeedback,
  setInput,
  analyze,
  retry,
  toggleChecklist,
  copyMarkdown,
  downloadMarkdown,
  reset,
  snapshot,
};
```

Then run:

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/state/useJdRadar.test.ts src/state/useJdRadar.export.test.ts
..\..\..\node_modules\.bin\vue-tsc.cmd --noEmit -p tsconfig.json
..\..\..\node_modules\.bin\eslint.cmd src/state --max-warnings 0
..\..\..\node_modules\.bin\prettier.cmd src/state --check
git diff --check
```

- [ ] **Step 15: Commit the complete state machine**

```powershell
git add -- packages/tools/jd-skill-radar/src/state
git commit -m "feat(jd-radar): 添加本地工作台状态机"
```

---

### Task 4: Public Boundary and Final Package Gate

**Files:**
- Modify: `packages/tools/jd-skill-radar/src/domain/index.ts`
- Modify: `packages/tools/jd-skill-radar/src/domain/index.test.ts`
- Modify: `packages/tools/jd-skill-radar/src/index.ts`
- Create: `packages/tools/jd-skill-radar/src/index.test.ts`

**Interfaces:**
- Produces package-root exports for Task 10 without executing `jdSkillRadarManifest.component()`。
- Preserves every Task 7/8 export and keeps browser/state internals outside the domain barrel。

- [ ] **Step 1: Extend domain boundary tests before exporting `toMarkdown`**

Modify `domain/index.test.ts` to import `toMarkdown` from `../index.ts`, while retaining all existing imports/assertions. Add one minimal typed call inside the existing test; do not replace previous coverage:

```ts
expect(typeof toMarkdown).toBe("function");
```

Append only this export to `domain/index.ts` after observing RED:

```ts
export { toMarkdown } from "./to-markdown.ts";
```

- [ ] **Step 2: Add a failing package-root Task 9 boundary test**

Create `src/index.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  copyMarkdown,
  downloadMarkdown,
  jdSkillRadarManifest,
  toMarkdown,
  useJdRadar,
} from "./index.ts";
import type {
  JdRadarController,
  JdRadarFeedback,
  JdRadarStatus,
  UseJdRadarOptions,
} from "./index.ts";

function acceptController(_controller: JdRadarController): void {
  void _controller;
}

function acceptFeedback(_feedback: JdRadarFeedback | null): void {
  void _feedback;
}

function acceptStatus(_status: JdRadarStatus): void {
  void _status;
}

function acceptOptions(_options: UseJdRadarOptions): void {
  void _options;
}

describe("JD radar Task 9 package entry", () => {
  it("exports local state and adapters without loading the lazy component", () => {
    const analyze = vi.fn(() => ({
      ok: false as const,
      error: { code: "EMPTY" as const, message: "请粘贴一份前端岗位 JD。" },
    }));
    const controller = useJdRadar({ analyze });

    expect(typeof toMarkdown).toBe("function");
    expect(typeof copyMarkdown).toBe("function");
    expect(typeof downloadMarkdown).toBe("function");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(jdSkillRadarManifest.capabilities).toEqual([]);
    expect(analyze).not.toHaveBeenCalled();

    acceptController(controller);
    acceptFeedback(controller.feedback.value);
    acceptStatus(controller.status.value);
    acceptOptions({ analyze });
  });
});
```

- [ ] **Step 3: Run boundary tests and verify RED**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/domain/index.test.ts src/index.test.ts
```

Expected: FAIL because Task 9 symbols are not yet exported.

- [ ] **Step 4: Add explicit public exports without touching manifest**

Append to `src/index.ts` after the existing exports:

```ts
export { copyMarkdown } from "./browser/copy-markdown.ts";
export { downloadMarkdown } from "./browser/download-markdown.ts";
export { useJdRadar } from "./state/useJdRadar.ts";
export type {
  JdRadarController,
  JdRadarDependencies,
  JdRadarFeedback,
  JdRadarFeedbackCode,
  JdRadarFeedbackKind,
  JdRadarSnapshot,
  JdRadarStatus,
  UseJdRadarOptions,
} from "./state/types.ts";
```

Do not export private label maps, adapter error messages, feedback constants, or filename constants.

- [ ] **Step 5: Run the boundary GREEN and scoped checks**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/domain/index.test.ts src/index.test.ts
..\..\..\node_modules\.bin\eslint.cmd src/domain/index.ts src/domain/index.test.ts src/index.ts src/index.test.ts --max-warnings 0
..\..\..\node_modules\.bin\prettier.cmd src/domain/index.ts src/domain/index.test.ts src/index.ts src/index.test.ts --check
git diff --check
```

- [ ] **Step 6: Commit the public boundary**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/index.ts packages/tools/jd-skill-radar/src/domain/index.test.ts packages/tools/jd-skill-radar/src/index.ts packages/tools/jd-skill-radar/src/index.test.ts
git commit -m "feat(jd-radar): 导出本地工作台状态接口"
```

- [ ] **Step 7: Run one final Task 9 package gate**

Run each command once from the isolated Task 9 worktree:

```powershell
$env:CI = "true"
pnpm.cmd install --frozen-lockfile --offline --ignore-scripts
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
.\node_modules\.bin\eslint.cmd packages/tools/jd-skill-radar/src --max-warnings 0
.\node_modules\.bin\prettier.cmd packages/tools/jd-skill-radar/src --check
git diff --check main...HEAD
node -e "import('@kunlun/jd-skill-radar').then(({ useJdRadar, jdSkillRadarManifest }) => { const radar = useJdRadar(); console.log(radar.status.value, jdSkillRadarManifest.status, jdSkillRadarManifest.capabilities.length); })"
```

Expected:

- frozen offline install exits 0 without lockfile changes;
- every JD package test passes;
- typecheck, lint, format and diff check pass;
- Node prints `idle draft 0` and does not invoke the lazy component loader.

Do not repeat successful gates and do not run root tests/build/E2E/visual checks.

- [ ] **Step 8: Audit privacy, scope, exports, and history**

```powershell
rg -n "contexts|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon" packages/tools/jd-skill-radar/src/domain/to-markdown.ts packages/tools/jd-skill-radar/src/browser packages/tools/jd-skill-radar/src/state
rg -n "\bany\b" packages/tools/jd-skill-radar/src/domain/to-markdown.ts packages/tools/jd-skill-radar/src/browser packages/tools/jd-skill-radar/src/state
git diff --name-only main...HEAD
git rev-list --merges main..HEAD
git log --format="%h %an <%ae> %s" main..HEAD
git status --short
git check-ignore -v AGENTS.override.md
```

Expected: no context export, persistence, network, authored `any`, UI/manifest/dependency changes, merge commits, wrong identity, tracked local override, or mutation residue. Interpret `rg` exit 1 as the expected no-match result.

- [ ] **Step 9: Request independent final review and integrate only after approval**

Review the confirmed design, this plan, Task 9 reports, all Task 9 commits, and `main...HEAD`. Require:

- no open P0–P2;
- deterministic Markdown and no JD body/context disclosure;
- safe Clipboard/download capability detection and URL cleanup;
- exact ready/stale/invalid/failed transitions;
- successful reanalysis clears checked IDs;
- invalid input clears old analysis;
- export failures do not alter ready/stale state;
- Task 7/8 package exports remain intact;
- manifest remains `draft` with no capabilities;
- no UI, network, storage, dependency, lockfile, or interview-notes expansion;
- linear history and identity `风岚 <1837115857@qq.com>`.

After approval, use the already confirmed local policy:

```powershell
git merge --ff-only codex/task-9-jd-export-state
```

Run one merged-result JD package test. Only after it passes, remove the Task 9 worktree and delete the merged feature branch with `git branch -d`. Do not push.

---

## Self-Review Record

- **Spec coverage:** Task 1 covers deterministic and privacy-safe Markdown; Task 2 isolates browser side effects and cleanup; Task 3 covers every approved state, transition, checklist rule, feedback and stale export; Task 4 protects public boundaries and performs the single package gate.
- **File boundaries:** pure domain code never imports browser/state modules; browser adapters do not import Vue; the state layer depends inward on domain and adapters; the package root is the only cross-layer public barrel.
- **Type consistency:** `JdRadarStatus`, `JdRadarFeedback`, `JdRadarDependencies`, `UseJdRadarOptions`, `JdRadarSnapshot` and `JdRadarController` are defined once in Task 3 and exported unchanged in Task 4.
- **Privacy:** no planned production path reads `contexts` or retains source JD outside the input ref; Markdown tests use a marker to prove context omission.
- **Validation discipline:** each unit has one real RED/GREEN; typecheck runs when the Vue state contract first appears and once at the final gate; no root-level or visual verification is included.
