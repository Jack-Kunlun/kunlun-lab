# JD 技能雷达 Vue 工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@kunlun/jd-skill-radar` 内完成可交互、可访问、响应式的 Vue 工作台，并把同一工具 manifest 从 `draft` 升级为 `alpha`。

**Architecture:** `JdSkillRadar.vue` 创建唯一的 `useJdRadar(options)` controller，并把只读状态和用户意图传给五个展示组件。子组件不复制业务状态、不调用领域算法或浏览器 API；正式组件通过 manifest 动态导入，Task 11 再负责 Nuxt 路由、`ToolShell` 和作品发布接线。

**Tech Stack:** TypeScript 6、Vue 3.5、Vue Test Utils 2、Vitest 4、`@kunlun/ui`、严格 ESLint、Prettier、pnpm workspace

## Global Constraints

- 开始执行前完整读取仓库根目录 `AGENTS.override.md`；不得修改、迁移或读取写入 `E:\interview-notes` 的项目内容。
- 执行阶段先使用 `superpowers:using-git-worktrees` 创建隔离工作树，建议分支 `codex/task-10-jd-vue-workbench`、目录 `.worktrees/task-10-jd-vue-workbench`。
- 使用 TypeScript；严格 ESLint 与 typecheck；禁止 `any`；字符串使用双引号；语句使用分号；文件使用 LF。
- 不新增或升级依赖，不改 `package.json`、`pnpm-lock.yaml` 或 workspace 配置。
- 只修改 `packages/tools/jd-skill-radar`；不修改 `apps/web`、`packages/tool-kit`、`packages/ui` 或内容文件。
- 必须消费现有 `useJdRadar()`、领域结果和浏览器适配器；不得重写分析、导出、复制、下载或竞态逻辑。
- 关键词上下文默认完整展示，不折叠、不截断；长文本必须换行。
- 不在工作台内部嵌套 `ToolShell`；Task 11 负责外层加载、错误隔离和路由集成。
- manifest 升级为 `status: "alpha"` 与 `capabilities: ["clipboard", "download"]`，但站点作品内容仍保持 `draft`。
- 不从包根 eager export `.vue` 组件；正式工作台继续只通过 manifest 动态导入。
- 测试只验证 Task 10 的组件行为和边界，不重复 Task 7 至 Task 9 的算法、状态机竞态或浏览器适配器内部测试。
- 每个任务先写失败测试、确认 RED、再做最小实现和限定 GREEN；同一失败不得无信息重复运行。
- 每个任务提交前依次检查 `git status --short`、目标文件 diff、`git diff --cached --name-status`、`git diff --cached --check` 和完整 staged diff；只暂存任务列出的文件，禁止提交 `.superpowers/`、报告、缓存或无关文件。
- Git 身份必须为 `风岚 <1837115857@qq.com>`；Conventional Commits 的 type/scope 使用英文，描述优先中文。
- 不推送远端；全部任务和审查通过后才允许 `git merge --ff-only` 线性合并到 `main`。
- 控制验证范围：每个任务运行聚焦测试和改动文件的 lint/format；完整 JD 包测试与包 typecheck 只在最终任务运行一次。

---

## File Map

### 新增文件

- `packages/tools/jd-skill-radar/src/components/JdInputPanel.vue`：输入、字符计数、分析/重试/重置和统一反馈区域。
- `packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts`：输入组件公开行为。
- `packages/tools/jd-skill-radar/src/components/presentation.ts`：技能分类和语气的中文展示映射。
- `packages/tools/jd-skill-radar/src/components/JdOverview.vue`：岗位概览。
- `packages/tools/jd-skill-radar/src/components/SkillDistribution.vue`：分类分值、命中次数和原生 `<meter>`。
- `packages/tools/jd-skill-radar/src/components/KeywordDetails.vue`：关键词次数、语气和完整上下文。
- `packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue`：原生清单、可选知识库链接和导出意图。
- `packages/tools/jd-skill-radar/src/components/AnalysisResults.test.ts`：四个结果组件的行为测试。
- `packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue`：唯一 controller 的根编排组件。
- `packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts`：六状态、动作接线和重置行为。
- `packages/tools/jd-skill-radar/src/styles.css`：B1 工作台、双栏和小于 `900px` 的单栏样式。

### 修改或删除文件

- `packages/tools/jd-skill-radar/src/manifest.ts`：升级状态、能力和正式组件 loader。
- `packages/tools/jd-skill-radar/src/manifest.test.ts`：验证 alpha 清单和正式懒加载组件。
- `packages/tools/jd-skill-radar/src/index.test.ts`：更新包边界断言，确认导入包根不会执行分析或加载工作台。
- 删除 `packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue`：正式工作台替代建设提示。

`packages/tools/jd-skill-radar/src/index.ts` 默认不修改；只有包边界测试证明现有导出不足时才停下并由 Sol 重审设计，不得自行导出 `.vue` 组件。

---

## Execution Setup

- [ ] **Step 1: 创建隔离工作树**

从干净 `main` 使用 `superpowers:using-git-worktrees` 创建：

```powershell
git worktree add .worktrees/task-10-jd-vue-workbench -b codex/task-10-jd-vue-workbench main
```

若 `.worktrees` 的忽略状态未通过技能检查，先停止并修正隔离策略，不要把工作树目录提交到仓库。

- [ ] **Step 2: 核验分支、身份和初始范围**

```powershell
git branch --show-current
git config user.name
git config user.email
git status --short
```

Expected：分支为 `codex/task-10-jd-vue-workbench`；身份为 `风岚` / `1837115857@qq.com`；没有来自主工作区的未跟踪 `.superpowers/` 或其他用户改动。

- [ ] **Step 3: 仅在依赖命令不可用时安装一次**

先检查：

```powershell
Test-Path .\node_modules\.bin\vitest.cmd
```

若输出 `False`，只运行一次：

```powershell
$env:CI = "true"
pnpm.cmd install --offline --frozen-lockfile
```

Expected：退出 0，`package.json` 与 `pnpm-lock.yaml` 无 diff。若离线依赖缺失，停止并报告，不循环安装。

---

### Task 1: 输入面板与统一反馈区域

**Files:**
- Create: `packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts`
- Create: `packages/tools/jd-skill-radar/src/components/JdInputPanel.vue`

**Interfaces:**
- Consumes: `JdRadarStatus`、`JdRadarFeedback`、`MAX_JD_LENGTH`、`LabButton`。
- Produces: props `input`、`status`、`feedback`；events `update:input`、`analyze`、`retry`、`reset`。
- Display rule: `NO_SKILLS` 映射为“未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。”，其余反馈使用 controller 的安全 `message`。

- [ ] **Step 1: 写输入面板失败测试**

创建 `JdInputPanel.test.ts`，至少包含以下真实行为：

```ts
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import JdInputPanel from "./JdInputPanel.vue";

describe("JdInputPanel", () => {
  it("emits input and primary actions from native controls", async () => {
    const wrapper = mount(JdInputPanel, {
      props: { feedback: null, input: "", status: "idle" },
    });

    await wrapper.get("textarea").setValue("TypeScript 与 Vue 岗位描述");
    await wrapper.get("[data-action=analyze]").trigger("click");

    expect(wrapper.emitted("update:input")?.[0]).toEqual(["TypeScript 与 Vue 岗位描述"]);
    expect(wrapper.emitted("analyze")).toHaveLength(1);
    expect(wrapper.text()).toContain("JD 不上传、不记录");
  });

  it("disables duplicate analysis while analyzing", () => {
    const wrapper = mount(JdInputPanel, {
      props: { feedback: null, input: "分析中的文本", status: "analyzing" },
    });

    expect(wrapper.get("[data-action=analyze]").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("正在分析");
  });

  it("renders the no-skills explanation in one polite live region", () => {
    const wrapper = mount(JdInputPanel, {
      props: {
        feedback: {
          code: "NO_SKILLS",
          kind: "error",
          message: "没有识别到当前词典支持的前端技能。",
        },
        input: "行政支持内容",
        status: "invalid",
      },
    });

    const feedback = wrapper.get("[aria-live=polite]");

    expect(feedback.text()).toBe(
      "未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。",
    );
    expect(wrapper.get("textarea").attributes("aria-invalid")).toBe("true");
    expect(wrapper.findAll("[aria-live=polite]")).toHaveLength(1);
  });

  it("offers retry only for failed analysis and emits reset", async () => {
    const wrapper = mount(JdInputPanel, {
      props: {
        feedback: { code: "ANALYSIS_FAILED", kind: "error", message: "分析失败，请重试" },
        input: "保留的输入",
        status: "failed",
      },
    });

    await wrapper.get("[data-action=retry]").trigger("click");
    await wrapper.get("[data-action=reset]").trigger("click");

    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.emitted("reset")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

从包目录运行：

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/components/JdInputPanel.test.ts
```

Expected：FAIL，原因是 `JdInputPanel.vue` 不存在；不得接受测试环境、命令解析或语法错误作为 RED。

- [ ] **Step 3: 实现最小输入组件**

`JdInputPanel.vue` 使用以下公开形状，不新增本地业务状态：

```vue
<script setup lang="ts">
import { computed } from "vue";
import { LabButton } from "@kunlun/ui";
import { MAX_JD_LENGTH } from "../domain/index.ts";
import type { JdRadarFeedback, JdRadarStatus } from "../state/types.ts";

const props = defineProps<{
  input: string;
  status: JdRadarStatus;
  feedback: JdRadarFeedback | null;
}>();

const emit = defineEmits<{
  "update:input": [value: string];
  analyze: [];
  retry: [];
  reset: [];
}>();

const displayMessage = computed(() => {
  if (props.feedback?.code === "NO_SKILLS") {
    return "未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。";
  }

  return props.feedback?.message ?? (props.status === "analyzing" ? "正在分析" : "");
});
const isAnalyzing = computed(() => props.status === "analyzing");
const isFailed = computed(() => props.status === "failed");
const isInvalid = computed(() => props.status === "invalid");
const canReset = computed(() => props.input.length > 0 || props.status !== "idle");

function handleInput(event: Event): void {
  if (event.currentTarget instanceof HTMLTextAreaElement) {
    emit("update:input", event.currentTarget.value);
  }
}

function requestAnalyze(): void {
  emit("analyze");
}

function requestRetry(): void {
  emit("retry");
}

function requestReset(): void {
  emit("reset");
}
</script>

<template>
  <section class="jd-input-panel" aria-labelledby="jd-input-heading">
    <div class="jd-input-panel__heading">
      <h2 id="jd-input-heading">粘贴招聘 JD</h2>
      <span>{{ input.length.toLocaleString("zh-CN") }} / {{ MAX_JD_LENGTH.toLocaleString("zh-CN") }}</span>
    </div>
    <label for="jd-radar-input">招聘 JD 纯文本</label>
    <textarea
      id="jd-radar-input"
      :aria-invalid="isInvalid"
      aria-describedby="jd-radar-feedback"
      :value="input"
      @input="handleInput"
    />
    <p id="jd-radar-feedback" aria-live="polite" :data-kind="feedback?.kind">
      {{ displayMessage }}
    </p>
    <div class="jd-input-panel__actions">
      <LabButton data-action="analyze" :disabled="isAnalyzing" @click="requestAnalyze">
        {{ isAnalyzing ? "正在分析" : "开始分析" }}
      </LabButton>
      <LabButton v-if="isFailed" data-action="retry" @click="requestRetry">
        重试分析
      </LabButton>
      <LabButton
        v-if="canReset"
        class="jd-button--secondary"
        data-action="reset"
        @click="requestReset"
      >
        清空重置
      </LabButton>
    </div>
    <p class="jd-input-panel__privacy">
      JD 不上传、不记录，默认不跨会话保存；Markdown 在本地生成。
    </p>
  </section>
</template>
```

保持模板可读；Prettier 可以调整换行，但不得改文案或接口。

- [ ] **Step 4: 运行限定 GREEN 与静态检查**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/components/JdInputPanel.test.ts
Set-Location ..\..\..
.\node_modules\.bin\eslint.cmd packages/tools/jd-skill-radar/src/components/JdInputPanel.vue packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts --max-warnings 0
.\node_modules\.bin\prettier.cmd packages/tools/jd-skill-radar/src/components/JdInputPanel.vue packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts --check
git diff --check
```

Expected：聚焦测试全部通过；ESLint、Prettier 和 diff check 退出 0。若只有 Prettier 失败，定向 `--write` 两个文件后只复查 Prettier，不重跑已通过测试。

- [ ] **Step 5: 核对并提交 Task 1**

```powershell
git status --short
git diff -- packages/tools/jd-skill-radar/src/components/JdInputPanel.vue packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts
git add -- packages/tools/jd-skill-radar/src/components/JdInputPanel.vue packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts
git diff --cached --name-status
git diff --cached --check
git diff --cached -- packages/tools/jd-skill-radar/src/components/JdInputPanel.vue packages/tools/jd-skill-radar/src/components/JdInputPanel.test.ts
git commit -m "feat(jd-radar): 添加 JD 输入面板"
```

Expected staged list：仅上述两个文件。提交后由独立 reviewer 检查输入语义、live region、文案与测试有效性；通过后进入 Task 2。

---

### Task 2: 结果展示组件

**Files:**
- Create: `packages/tools/jd-skill-radar/src/components/presentation.ts`
- Create: `packages/tools/jd-skill-radar/src/components/JdOverview.vue`
- Create: `packages/tools/jd-skill-radar/src/components/SkillDistribution.vue`
- Create: `packages/tools/jd-skill-radar/src/components/KeywordDetails.vue`
- Create: `packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue`
- Create: `packages/tools/jd-skill-radar/src/components/AnalysisResults.test.ts`

**Interfaces:**
- Consumes: `DeepReadonly<JdOverview | JdCategoryScore | JdKeyword | JdChecklistItem>`、`ReadonlySet<string>`、`LabButton`、`MetricCell`。
- Produces: `SKILL_CATEGORY_LABELS`、`REQUIREMENT_TONE_LABELS`；结果展示 props；`PreparationChecklist` events `toggle(id)`、`copy`、`download`。
- Ordering: 所有数组严格使用分析结果既有顺序，不重排、不重新聚合。

- [ ] **Step 1: 写结果组件失败测试**

创建 `AnalysisResults.test.ts`：

```ts
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import JdOverview from "./JdOverview.vue";
import KeywordDetails from "./KeywordDetails.vue";
import PreparationChecklist from "./PreparationChecklist.vue";
import SkillDistribution from "./SkillDistribution.vue";

describe("JD analysis result components", () => {
  it("renders unknown overview fields without inference", () => {
    const wrapper = mount(JdOverview, {
      props: {
        overview: {
          role: "前端工程师",
          experience: "",
          education: "",
          location: "杭州 / 混合办公",
          primaryFrameworks: [],
        },
      },
    });

    expect(wrapper.text()).toContain("前端工程师");
    expect(wrapper.text().match(/未识别/g)).toHaveLength(3);
  });

  it("pairs every category score with native meter and textual values", () => {
    const wrapper = mount(SkillDistribution, {
      props: {
        categories: [
          { category: "language", matchCount: 3, score: 88 },
          { category: "framework", matchCount: 2, score: 64 },
        ],
      },
    });

    expect(wrapper.findAll("meter")).toHaveLength(2);
    expect(wrapper.findAll("meter").map((meter) => meter.attributes("value"))).toEqual(["88", "64"]);
    expect(wrapper.text()).toContain("语言");
    expect(wrapper.text()).toContain("88 / 100");
    expect(wrapper.text()).toContain("3 次命中");
  });

  it("keeps keyword order and renders every full context", () => {
    const contexts = [
      "要求熟练掌握 TypeScript，并能在大型工程中设计稳定的类型边界。",
      "具备 TypeScript 工程实践经验，能够维护严格的类型检查。",
    ];
    const wrapper = mount(KeywordDetails, {
      props: {
        keywords: [
          {
            category: "language",
            contexts,
            count: 2,
            label: "TypeScript",
            skillId: "typescript",
            tone: "required",
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("TypeScript");
    expect(wrapper.text()).toContain("2 次");
    expect(wrapper.text()).toContain("必须");
    contexts.forEach((context) => expect(wrapper.text()).toContain(context));
  });

  it("uses native checklist controls and only renders verified links", async () => {
    const wrapper = mount(PreparationChecklist, {
      props: {
        checkedIds: new Set<string>(["prepare:typescript"]),
        items: [
          {
            id: "prepare:typescript",
            label: "复习 TypeScript 核心知识",
            noteUrl: "https://www.kunlunmarket.work/typescript",
          },
          { id: "prepare:vue", label: "准备 Vue 项目实践案例" },
        ],
      },
    });

    const checkboxes = wrapper.findAll("input[type=checkbox]");
    const typescriptCheckbox = checkboxes[0];
    const vueCheckbox = checkboxes[1];

    expect(checkboxes).toHaveLength(2);
    expect(typescriptCheckbox).toBeDefined();
    expect(vueCheckbox).toBeDefined();
    expect(wrapper.findAll("a")).toHaveLength(1);

    if (typescriptCheckbox === undefined || vueCheckbox === undefined) {
      throw new Error("Expected two checklist controls.");
    }

    expect(typescriptCheckbox.attributes("checked")).toBeDefined();
    await vueCheckbox.setValue(true);
    await wrapper.get("[data-action=copy]").trigger("click");
    await wrapper.get("[data-action=download]").trigger("click");

    expect(wrapper.emitted("toggle")?.[0]).toEqual(["prepare:vue"]);
    expect(wrapper.emitted("copy")).toHaveLength(1);
    expect(wrapper.emitted("download")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/components/AnalysisResults.test.ts
```

Expected：FAIL，原因是结果组件不存在。

- [ ] **Step 3: 添加唯一展示映射**

创建 `presentation.ts`：

```ts
import type { RequirementTone, SkillCategory } from "../domain/types.ts";

export const SKILL_CATEGORY_LABELS = {
  language: "语言",
  framework: "框架",
  css: "CSS",
  engineering: "工程化",
  performance: "性能",
  nodejs: "Node.js",
  "cross-platform": "跨端",
  devops: "DevOps",
  collaboration: "协作",
} as const satisfies Readonly<Record<SkillCategory, string>>;

export const REQUIREMENT_TONE_LABELS = {
  required: "必须",
  preferred: "加分",
  familiar: "熟悉",
  neutral: "提及",
} as const satisfies Readonly<Record<RequirementTone, string>>;
```

不得把展示标签写回领域字典或改变既有 tone/category 类型。

- [ ] **Step 4: 实现四个只读结果组件**

遵循下列最小结构：

```vue
<!-- JdOverview.vue -->
<script setup lang="ts">
import { MetricCell } from "@kunlun/ui";
import { computed } from "vue";
import type { DeepReadonly } from "vue";
import type { JdOverview } from "../domain/types.ts";

const props = defineProps<{ overview: DeepReadonly<JdOverview> }>();
const show = (value: string): string => (value.length === 0 ? "未识别" : value);
const primaryFrameworks = computed(() =>
  props.overview.primaryFrameworks.length > 0
    ? props.overview.primaryFrameworks.join("、")
    : "未识别",
);
</script>

<template>
  <section class="jd-module" aria-labelledby="jd-overview-heading">
    <h2 id="jd-overview-heading">岗位概览</h2>
    <div class="jd-overview-grid">
      <MetricCell label="岗位线索" :value="show(props.overview.role)" />
      <MetricCell label="经验要求" :value="show(props.overview.experience)" />
      <MetricCell label="学历要求" :value="show(props.overview.education)" />
      <MetricCell label="地点 / 工作方式" :value="show(props.overview.location)" />
      <MetricCell label="主要框架" :value="primaryFrameworks" />
    </div>
  </section>
</template>
```

```vue
<!-- SkillDistribution.vue -->
<script setup lang="ts">
import type { DeepReadonly } from "vue";
import type { JdCategoryScore } from "../domain/types.ts";
import { SKILL_CATEGORY_LABELS } from "./presentation.ts";

defineProps<{ categories: readonly DeepReadonly<JdCategoryScore>[] }>();
</script>

<template>
  <section class="jd-module" aria-labelledby="jd-distribution-heading">
    <h2 id="jd-distribution-heading">技能分布</h2>
    <div v-for="category in categories" :key="category.category" class="jd-score-row">
      <span>{{ SKILL_CATEGORY_LABELS[category.category] }}</span>
      <meter min="0" max="100" :value="category.score">
        {{ category.score }} / 100
      </meter>
      <strong>{{ category.score }} / 100</strong>
      <span>{{ category.matchCount }} 次命中</span>
    </div>
  </section>
</template>
```

```vue
<!-- KeywordDetails.vue -->
<script setup lang="ts">
import type { DeepReadonly } from "vue";
import type { JdKeyword } from "../domain/types.ts";
import { REQUIREMENT_TONE_LABELS, SKILL_CATEGORY_LABELS } from "./presentation.ts";

defineProps<{ keywords: readonly DeepReadonly<JdKeyword>[] }>();
</script>

<template>
  <section class="jd-module" aria-labelledby="jd-keywords-heading">
    <h2 id="jd-keywords-heading">关键词明细</h2>
    <article v-for="keyword in keywords" :key="keyword.skillId" class="jd-keyword">
      <header>
        <h3>{{ keyword.label }}</h3>
        <span>{{ keyword.count }} 次</span>
        <span>{{ REQUIREMENT_TONE_LABELS[keyword.tone] }}</span>
        <span>{{ SKILL_CATEGORY_LABELS[keyword.category] }}</span>
      </header>
      <ul class="jd-keyword__contexts">
        <li v-for="(context, index) in keyword.contexts" :key="`${keyword.skillId}:${index}`">
          {{ context }}
        </li>
      </ul>
    </article>
  </section>
</template>
```

```vue
<!-- PreparationChecklist.vue 核心接口与模板 -->
<script setup lang="ts">
import { LabButton } from "@kunlun/ui";
import type { DeepReadonly } from "vue";
import type { JdChecklistItem } from "../domain/types.ts";

defineProps<{
  items: readonly DeepReadonly<JdChecklistItem>[];
  checkedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  copy: [];
  download: [];
}>();

function toggle(id: string): void {
  emit("toggle", id);
}

function copy(): void {
  emit("copy");
}

function download(): void {
  emit("download");
}
</script>

<template>
  <section class="jd-module" aria-labelledby="jd-checklist-heading">
    <h2 id="jd-checklist-heading">准备清单</h2>
    <label v-for="item in items" :key="item.id" class="jd-checklist-item">
      <input
        type="checkbox"
        :checked="checkedIds.has(item.id)"
        @change="toggle(item.id)"
      />
      <span>{{ item.label }}</span>
      <a v-if="item.noteUrl !== undefined" :href="item.noteUrl">查看知识库章节</a>
    </label>
    <div class="jd-export-actions">
      <LabButton class="jd-button--secondary" data-action="copy" @click="copy">
        复制 Markdown
      </LabButton>
      <LabButton class="jd-button--secondary" data-action="download" @click="download">
        下载 Markdown
      </LabButton>
    </div>
  </section>
</template>
```

`JdOverview.vue`、`SkillDistribution.vue`、`KeywordDetails.vue` 和 `PreparationChecklist.vue` 的最外层均为语义 section；不要再包一层无语义卡片，统一模块边界由 `styles.css` 提供。

- [ ] **Step 5: 运行限定 GREEN 与静态检查**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/components/AnalysisResults.test.ts
Set-Location ..\..\..
.\node_modules\.bin\eslint.cmd packages/tools/jd-skill-radar/src/components/presentation.ts packages/tools/jd-skill-radar/src/components/JdOverview.vue packages/tools/jd-skill-radar/src/components/SkillDistribution.vue packages/tools/jd-skill-radar/src/components/KeywordDetails.vue packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue packages/tools/jd-skill-radar/src/components/AnalysisResults.test.ts --max-warnings 0
.\node_modules\.bin\prettier.cmd packages/tools/jd-skill-radar/src/components/presentation.ts packages/tools/jd-skill-radar/src/components/JdOverview.vue packages/tools/jd-skill-radar/src/components/SkillDistribution.vue packages/tools/jd-skill-radar/src/components/KeywordDetails.vue packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue packages/tools/jd-skill-radar/src/components/AnalysisResults.test.ts --check
git diff --check
```

Expected：聚焦测试和限定检查退出 0。不要在此任务运行完整 JD 包测试或 typecheck。

- [ ] **Step 6: 做一次上下文截断 mutation**

临时只渲染 `keyword.contexts[0]`，运行：

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/components/AnalysisResults.test.ts
```

Expected：`keeps keyword order and renders every full context` 失败。立即用 `apply_patch` 恢复完整 `v-for`，再运行同一聚焦测试一次并确认通过。不得留下 mutation diff。

- [ ] **Step 7: 核对并提交 Task 2**

```powershell
Set-Location ..\..\..
git status --short
git diff -- packages/tools/jd-skill-radar/src/components
git add -- packages/tools/jd-skill-radar/src/components/presentation.ts packages/tools/jd-skill-radar/src/components/JdOverview.vue packages/tools/jd-skill-radar/src/components/SkillDistribution.vue packages/tools/jd-skill-radar/src/components/KeywordDetails.vue packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue packages/tools/jd-skill-radar/src/components/AnalysisResults.test.ts
git diff --cached --name-status
git diff --cached --check
git diff --cached -- packages/tools/jd-skill-radar/src/components
git commit -m "feat(jd-radar): 添加分析结果组件"
```

Expected staged list：仅本任务六个文件。独立 reviewer 检查只读边界、完整上下文、原生语义、可选链接和测试有效性。

---

### Task 3: 根工作台、六状态编排与 B1 响应式样式

**Files:**
- Create: `packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts`
- Create: `packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue`
- Create: `packages/tools/jd-skill-radar/src/styles.css`

**Interfaces:**
- Consumes: `useJdRadar(options?: UseJdRadarOptions)`、Task 1 输入面板、Task 2 结果组件。
- Produces: default Vue component `JdSkillRadar.vue` with optional prop `options?: UseJdRadarOptions`。
- State rule: 仅 `ready` 与 `stale` 渲染结果；`stale` 保留旧结果并显示文字横幅；`invalid` 与 `failed` 不渲染结果。
- Test seam: 测试只通过 `options` 注入 analyze/copy/download 端口；不得新增 controller factory、provide/inject 或全局 singleton。

- [ ] **Step 1: 写六状态与动作失败测试**

创建 `JdSkillRadar.test.ts`。使用固定分析对象和 typed deferred，不使用 `any`：

```ts
// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { AnalyzeJdResult, JdAnalysis } from "../domain/types.ts";
import JdSkillRadar from "./JdSkillRadar.vue";

const validInput = "TypeScript、Vue、工程化、性能优化与团队协作岗位要求。".repeat(4);
const analysis: JdAnalysis = {
  overview: {
    role: "前端工程师",
    experience: "3-5 年",
    education: "本科",
    location: "杭州 / 混合办公",
    primaryFrameworks: ["Vue"],
  },
  categories: [{ category: "language", matchCount: 2, score: 100 }],
  keywords: [
    {
      category: "language",
      contexts: ["必须熟练掌握 TypeScript"],
      count: 2,
      label: "TypeScript",
      skillId: "typescript",
      tone: "required",
    },
  ],
  checklist: [{ id: "prepare:typescript", label: "复习 TypeScript 核心知识" }],
  meta: { categoryCount: 1, characterCount: validInput.length, skillCount: 1 },
};
const success: AnalyzeJdResult = { ok: true, value: analysis };

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
```

在同一文件添加以下聚焦用例：

```ts
describe("JdSkillRadar", () => {
  it("starts idle with one labeled input and no results", () => {
    const wrapper = mount(JdSkillRadar);

    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
    expect(wrapper.findAll("h1")).toHaveLength(1);
  });

  it("shows analyzing and then all ready modules", async () => {
    const deferred = createDeferred<AnalyzeJdResult>();
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => deferred.promise } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("正在分析");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);

    deferred.resolve(success);
    await flushPromises();

    expect(wrapper.get("[data-results=true]").text()).toContain("岗位概览");
    expect(wrapper.get("[data-results=true]").text()).toContain("技能分布");
    expect(wrapper.get("[data-results=true]").text()).toContain("关键词明细");
    expect(wrapper.get("[data-results=true]").text()).toContain("准备清单");
  });

  it("retains results and announces stale after input changes", async () => {
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => success } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();
    await wrapper.get("textarea").setValue(`${validInput}\n新修改`);

    expect(wrapper.get("[data-status=stale]").text()).toContain(
      "输入已修改，当前结果已过期",
    );
    expect(wrapper.find("[data-results=true]").exists()).toBe(true);
  });

  it("hides unexpected failures and retries the latest input", async () => {
    const analyze = vi
      .fn<(text: string) => AnalyzeJdResult | Promise<AnalyzeJdResult>>()
      .mockRejectedValueOnce(new Error("internal marker"))
      .mockReturnValueOnce(success);
    const wrapper = mount(JdSkillRadar, { props: { options: { analyze } } });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("分析失败，请重试");
    expect(wrapper.text()).not.toContain("internal marker");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);

    await wrapper.get("[data-action=retry]").trigger("click");
    await flushPromises();

    expect(analyze).toHaveBeenLastCalledWith(validInput);
    expect(wrapper.find("[data-results=true]").exists()).toBe(true);
  });

  it("explains no-skills input without retaining results", async () => {
    const noSkills: AnalyzeJdResult = {
      ok: false,
      error: { code: "NO_SKILLS", message: "没有识别到当前词典支持的前端技能。" },
    };
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => noSkills } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。",
    );
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
  });

  it("connects checklist and export actions and reset returns idle", async () => {
    const copy = vi.fn<(markdown: string) => Promise<void>>().mockResolvedValue();
    const download = vi.fn<(markdown: string, filename: string) => void>();
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => success, copy, download } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();
    await wrapper.get("input[type=checkbox]").setValue(true);
    await wrapper.get("[data-action=copy]").trigger("click");
    await wrapper.get("[data-action=download]").trigger("click");
    await flushPromises();

    expect(copy).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();

    await wrapper.get("[data-action=reset]").trigger("click");

    expect(wrapper.get("textarea").element).toHaveProperty("value", "");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/components/JdSkillRadar.test.ts
```

Expected：FAIL，原因是 `JdSkillRadar.vue` 不存在。

- [ ] **Step 3: 实现唯一根 controller 编排**

创建 `JdSkillRadar.vue`，核心结构如下：

```vue
<script setup lang="ts">
import { StatusBadge } from "@kunlun/ui";
import { computed } from "vue";
import type { DeepReadonly } from "vue";
import type { JdAnalysis } from "../domain/types.ts";
import { useJdRadar } from "../state/useJdRadar.ts";
import type { UseJdRadarOptions } from "../state/types.ts";
import JdInputPanel from "./JdInputPanel.vue";
import JdOverview from "./JdOverview.vue";
import KeywordDetails from "./KeywordDetails.vue";
import PreparationChecklist from "./PreparationChecklist.vue";
import SkillDistribution from "./SkillDistribution.vue";
import "../styles.css";

const props = defineProps<{ options?: UseJdRadarOptions }>();
const controller = useJdRadar(props.options);
const visibleAnalysis = computed<DeepReadonly<JdAnalysis> | null>(() => {
  if (controller.status.value !== "ready" && controller.status.value !== "stale") {
    return null;
  }

  return controller.analysis.value;
});
const isStale = computed(() => controller.status.value === "stale");

async function analyze(): Promise<void> {
  await controller.analyze();
}

async function retry(): Promise<void> {
  await controller.retry();
}

async function copy(): Promise<void> {
  await controller.copyMarkdown();
}

async function download(): Promise<void> {
  await controller.downloadMarkdown();
}
</script>

<template>
  <main class="jd-radar" :class="`jd-radar--${controller.status.value}`">
    <header class="jd-radar__header">
      <div>
        <p class="jd-radar__eyebrow">WORKBENCH / JD-SKILL-RADAR</p>
        <h1>前端岗位 JD 技能雷达</h1>
        <p>把招聘文本整理为技能信号、语气强度与可执行的准备清单。</p>
      </div>
      <StatusBadge label="CLIENT_ONLY · ALPHA" tone="experiment" />
    </header>

    <div class="jd-radar__workspace">
      <JdInputPanel
        :feedback="controller.feedback.value"
        :input="controller.input.value"
        :status="controller.status.value"
        @analyze="analyze"
        @reset="controller.reset"
        @retry="retry"
        @update:input="controller.setInput"
      />

      <section v-if="visibleAnalysis" class="jd-radar__results" data-results="true">
        <p v-if="isStale" data-status="stale">
          输入已修改，当前结果已过期。重新分析后会替换旧结果。
        </p>
        <JdOverview :overview="visibleAnalysis.overview" />
        <SkillDistribution :categories="visibleAnalysis.categories" />
        <KeywordDetails :keywords="visibleAnalysis.keywords" />
        <PreparationChecklist
          :checked-ids="controller.checkedIds.value"
          :items="visibleAnalysis.checklist"
          @copy="copy"
          @download="download"
          @toggle="controller.toggleChecklist"
        />
      </section>
    </div>

    <footer class="jd-radar__disclaimer">
      技能分值只表示当前 JD 文本的强调程度，不代表岗位质量、个人能力或面试结果。
    </footer>
  </main>
</template>
```

若 Vue 模板类型检查不能在 `v-if="visibleAnalysis"` 分支内保持收窄，改为一个只接收非空 `analysis` 的内部结果组件；不得使用非空断言、`any`、`@ts-ignore` 或复制分析对象。

- [ ] **Step 4: 实现 B1 与响应式样式**

创建 `styles.css`，必须包含这些结构规则：

```css
.jd-radar {
  overflow: hidden;
  border: 1px solid var(--lab-border);
  border-radius: 0.625rem;
  background-color: var(--lab-bg);
  background-image:
    linear-gradient(color-mix(in srgb, var(--lab-border) 18%, transparent) 1px, transparent 1px),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--lab-border) 18%, transparent) 1px,
      transparent 1px
    );
  background-size: 1.5rem 1.5rem;
  color: var(--lab-text);
}

.jd-radar__workspace {
  display: grid;
  grid-template-columns: minmax(18rem, 0.85fr) minmax(0, 1.45fr);
  min-width: 0;
}

.jd-radar__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid var(--lab-border);
}

.jd-radar__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--lab-experiment);
  font-family: var(--lab-font-mono);
}

.jd-input-panel,
.jd-radar__results {
  min-width: 0;
  padding: 1.25rem;
}

.jd-input-panel {
  border-right: 1px solid var(--lab-border);
  background: color-mix(in srgb, var(--lab-bg) 88%, transparent);
}

.jd-input-panel__heading,
.jd-input-panel__actions,
.jd-export-actions,
.jd-keyword header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.jd-input-panel__heading {
  justify-content: space-between;
}

.jd-input-panel textarea {
  display: block;
  width: 100%;
  min-height: 18rem;
  resize: vertical;
  border: 1px solid var(--lab-border);
  border-radius: 0.375rem;
  background: var(--lab-bg);
  color: var(--lab-text);
  font-family: var(--lab-font-mono);
  padding: 0.875rem;
}

.jd-input-panel__privacy,
.jd-radar__disclaimer {
  color: var(--lab-muted);
}

.jd-input-panel [aria-live="polite"] {
  min-height: 1.6em;
}

.jd-button--secondary {
  border-color: var(--lab-border);
  background: var(--lab-surface);
  color: var(--lab-text);
}

.jd-radar__results {
  display: grid;
  gap: 1rem;
}

.jd-radar__results [data-status="stale"] {
  margin: 0;
  border-left: 0.25rem solid var(--lab-experiment);
  background: color-mix(in srgb, var(--lab-experiment) 10%, var(--lab-surface));
  padding: 0.75rem 1rem;
}

.jd-module {
  border-top: 1px solid var(--lab-border);
  padding-top: 1rem;
}

.jd-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
}

.jd-score-row {
  display: grid;
  grid-template-columns: minmax(5rem, auto) minmax(6rem, 1fr) auto auto;
  align-items: center;
  gap: 0.75rem;
}

.jd-keyword {
  border-left: 0.125rem solid var(--lab-accent);
  background: color-mix(in srgb, var(--lab-surface) 82%, transparent);
  padding: 0.875rem;
}

.jd-keyword__contexts {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0;
}

.jd-checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.jd-checklist-item input {
  margin-top: 0.3rem;
  accent-color: var(--lab-accent);
}

.jd-checklist-item a {
  color: var(--lab-experiment);
}

.jd-radar__disclaimer {
  margin: 0;
  border-top: 1px solid var(--lab-border);
  padding: 0.875rem 1.25rem;
}

.jd-radar--idle .jd-radar__workspace,
.jd-radar--invalid .jd-radar__workspace,
.jd-radar--failed .jd-radar__workspace {
  grid-template-columns: minmax(0, 42rem);
  justify-content: center;
}

.jd-radar__results,
.jd-module,
.jd-keyword,
.jd-keyword__contexts,
.jd-checklist-item {
  min-width: 0;
}

.jd-keyword,
.jd-keyword__contexts li,
.jd-checklist-item,
.jd-checklist-item a {
  overflow-wrap: anywhere;
}

.jd-score-row meter {
  width: 100%;
  accent-color: var(--lab-accent);
}

@media (max-width: 899px) {
  .jd-radar__workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .jd-radar__results {
    border-top: 1px solid var(--lab-border);
  }

  .jd-input-panel {
    border-right: 0;
  }

  .jd-score-row {
    grid-template-columns: minmax(4.5rem, auto) minmax(5rem, 1fr) auto;
  }

  .jd-score-row span:last-child {
    grid-column: 2 / -1;
  }
}
```

在这组规则上只添加模板确实需要的垂直间距和 heading margin reset。只使用现有 `--lab-*` 令牌；错误、过期与成功状态必须同时有文字，不得只用颜色。不要增加无限动画；现有全局 `prefers-reduced-motion` 即为边界。

- [ ] **Step 5: 运行根组件 GREEN、typecheck 与限定静态检查**

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/components/JdSkillRadar.test.ts
pnpm.cmd typecheck
Set-Location ..\..\..
.\node_modules\.bin\eslint.cmd packages/tools/jd-skill-radar/src/components --max-warnings 0
.\node_modules\.bin\prettier.cmd packages/tools/jd-skill-radar/src/components packages/tools/jd-skill-radar/src/styles.css --check
git diff --check
```

Expected：根组件测试、包 typecheck、限定 lint/format 和 diff check 通过。ESLint 只检查其支持的 Vue/TypeScript 文件，Prettier 同时检查 `styles.css`。

- [ ] **Step 6: 做一次 stale 可见性 mutation**

临时把结果条件改为仅允许 `ready`，运行根组件聚焦测试。Expected：`retains results and announces stale after input changes` 失败。恢复 `ready || stale` 后只重跑该聚焦测试一次并确认通过。

- [ ] **Step 7: 核对并提交 Task 3**

```powershell
git status --short
git diff -- packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts packages/tools/jd-skill-radar/src/styles.css
git add -- packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts packages/tools/jd-skill-radar/src/styles.css
git diff --cached --name-status
git diff --cached --check
git diff --cached -- packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts packages/tools/jd-skill-radar/src/styles.css
git commit -m "feat(jd-radar): 添加响应式分析工作台"
```

Expected staged list：仅三个文件。独立 reviewer 必须检查六状态、controller 唯一性、异步动作、完整上下文可见性、ARIA、900px 断点和测试接缝。

---

### Task 4: Alpha Manifest、懒加载边界与最终门禁

**Files:**
- Modify: `packages/tools/jd-skill-radar/src/manifest.test.ts`
- Modify: `packages/tools/jd-skill-radar/src/manifest.ts`
- Modify: `packages/tools/jd-skill-radar/src/index.test.ts`
- Delete: `packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue`

**Interfaces:**
- Consumes: default export from `./components/JdSkillRadar.vue`。
- Produces: unchanged tool ID `jd-skill-radar`; `runtime: "client"`; `status: "alpha"`; exact capabilities `clipboard`, `download`; lazy component loader。
- Boundary: `src/index.ts` 保持现有导出，不新增 `.vue` eager export。

- [ ] **Step 1: 更新边界测试并确认 RED**

先把 `manifest.test.ts` 的旧 draft 用例改为：

```ts
it("registers one truthful alpha identity with local export capabilities", () => {
  const registry = createToolRegistry([jdSkillRadarManifest]);

  expect(registry.get("jd-skill-radar")).toMatchObject({
    capabilities: ["clipboard", "download"],
    id: "jd-skill-radar",
    runtime: "client",
    status: "alpha",
    title: "前端岗位 JD 技能雷达",
  });
});

it("lazily loads the interactive workbench", async () => {
  const loadedComponent = await jdSkillRadarManifest.component();
  const wrapper = mount(loadedComponent.default);

  expect(wrapper.get("textarea").attributes("aria-describedby")).toBeDefined();
  expect(wrapper.text()).toContain("开始分析");
  expect(wrapper.text()).not.toContain("工具仍在建设中");
});
```

同步把 `index.test.ts` 中旧断言改为：

```ts
expect(jdSkillRadarManifest.status).toBe("alpha");
expect(jdSkillRadarManifest.capabilities).toEqual(["clipboard", "download"]);
expect(analyze).not.toHaveBeenCalled();
```

运行：

```powershell
Set-Location packages/tools/jd-skill-radar
..\..\..\node_modules\.bin\vitest.cmd run src/manifest.test.ts src/index.test.ts
```

Expected：FAIL，旧 manifest 仍为 `draft`、capabilities 为空、loader 指向草稿组件。

- [ ] **Step 2: 最小升级 manifest 并删除草稿组件**

`manifest.ts` 精确改为：

```ts
import type { ToolManifest } from "@kunlun/shared";

export const jdSkillRadarManifest: ToolManifest = {
  capabilities: ["clipboard", "download"],
  component: () => import("./components/JdSkillRadar.vue"),
  id: "jd-skill-radar",
  runtime: "client",
  status: "alpha",
  title: "前端岗位 JD 技能雷达",
} satisfies ToolManifest;
```

删除 `JdSkillRadarDraft.vue`。使用：

```powershell
rg -n "JdSkillRadarDraft|工具仍在建设中" packages/tools/jd-skill-radar/src
```

Expected：除更新测试中的否定断言外，没有草稿组件引用；不得创建第二个 manifest 或工具 ID。

- [ ] **Step 3: 运行边界 GREEN**

```powershell
..\..\..\node_modules\.bin\vitest.cmd run src/manifest.test.ts src/index.test.ts
```

Expected：两个测试文件通过；加载 manifest 前不会执行 analyze，显式调用 loader 后能挂载正式工作台。

- [ ] **Step 4: 运行一次最终最小门禁**

从工作树根目录运行，每项一次：

```powershell
Set-Location ..\..\..
$env:CI = "true"
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
.\node_modules\.bin\eslint.cmd packages/tools/jd-skill-radar/src --max-warnings 0
.\node_modules\.bin\prettier.cmd packages/tools/jd-skill-radar/src --check
git diff --check
```

Expected：完整 JD 包测试全部通过，包 typecheck、完整包 `src` ESLint、Prettier 和 diff check 退出 0。不要运行根测试、全仓 lint、全仓 typecheck、生产 build、E2E 或 Docker。

若某一门禁失败，立即停止后续门禁，记录准确命令和错误；只修复 Task 10 范围内的根因，并从失败点定向续跑，不能重复已经通过的完整门禁。

- [ ] **Step 5: 核对删除、修改和 ignored 内容后提交 Task 4**

```powershell
git status --short
git diff -- packages/tools/jd-skill-radar/src/manifest.ts packages/tools/jd-skill-radar/src/manifest.test.ts packages/tools/jd-skill-radar/src/index.test.ts packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue
git add -- packages/tools/jd-skill-radar/src/manifest.ts packages/tools/jd-skill-radar/src/manifest.test.ts packages/tools/jd-skill-radar/src/index.test.ts packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue
git diff --cached --name-status
git diff --cached --check
git diff --cached -- packages/tools/jd-skill-radar/src/manifest.ts packages/tools/jd-skill-radar/src/manifest.test.ts packages/tools/jd-skill-radar/src/index.test.ts packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue
git commit -m "feat(jd-radar): 发布 alpha 工作台清单"
```

Expected staged list：三个修改文件和一个删除文件；不得包含 `src/index.ts`、apps/web、lockfile、报告或 `.superpowers/`。

- [ ] **Step 6: 运行提交后边界探针与历史审计**

```powershell
node -e "import('@kunlun/jd-skill-radar').then(({ jdSkillRadarManifest }) => console.log(jdSkillRadarManifest.status, jdSkillRadarManifest.capabilities.join(',')))"
git diff --check main...HEAD
git diff --name-status main...HEAD
git log --format="%h %an <%ae> %s" main..HEAD
git status --short
```

Expected：

- Node 输出 `alpha clipboard,download`；
- diff check 无输出；
- 范围只在 `packages/tools/jd-skill-radar/src/components`、`src/styles.css`、`src/manifest.ts`、`src/manifest.test.ts`、`src/index.test.ts`；
- 历史为四组中文描述的线性 Conventional Commits，作者均为 `风岚 <1837115857@qq.com>`；
- 工作树无 tracked 或 staged 改动；ignored 执行报告可以存在但不得提交。

- [ ] **Step 7: 独立最终审查与线性合并准备**

审查者只读检查 `main...HEAD`，重点确认：

- 六状态映射和旧结果可见性符合设计；
- controller 唯一且测试接缝仅为 `UseJdRadarOptions`；
- 关键词上下文无折叠、截断或重新排序；
- 原生 textarea、button、checkbox、meter 与文字状态完整；
- manifest 能力、状态和 loader 真实；
- 没有 eager `.vue` 根导出、网络、持久化、ToolShell 或 apps/web 变更；
- 测试覆盖行为边界且没有过度重复 Task 7 至 Task 9。

只有审查无 P0-P2 且最终门禁证据有效时，Sol 才能在主工作区执行 `git merge --ff-only codex/task-10-jd-vue-workbench`。合并后只在同一 SHA 运行一次 JD 包测试；通过后再删除分支和 worktree，不推送。

---

## Acceptance Checklist

- [ ] 工作台只创建一个 `useJdRadar(options)` controller。
- [ ] `idle`、`analyzing`、`ready`、`stale`、`invalid`、`failed` 六状态均有可见且测试覆盖的行为。
- [ ] `stale` 保留旧分析和勾选并显示明确文字；`invalid`、`failed` 不显示结果。
- [ ] 岗位概览缺失值显示“未识别”，不推断。
- [ ] 技能分布使用 `<meter>` 并显示分值和命中次数。
- [ ] 关键词按原顺序呈现所有完整上下文、累计次数和最强语气。
- [ ] 准备清单使用原生 checkbox，仅为真实 `noteUrl` 渲染链接。
- [ ] 复制、下载、重试、重置接入 Task 9 controller 动作。
- [ ] 只有一个 `aria-live="polite"` 反馈区域，异常对象和堆栈不进入界面。
- [ ] 桌面使用批准的非对称双栏，小于 `900px` 输入在上、结果在下。
- [ ] B1 样式只复用 `--lab-*` 令牌，状态不只依靠颜色。
- [ ] manifest 为 `alpha`，能力精确为 `clipboard`、`download`，正式组件仍懒加载。
- [ ] 草稿组件删除，包根无 eager Vue export，apps/web 内容仍未修改。
- [ ] 完整 JD 包测试、包 typecheck、包内 src lint/format、diff check 和 Node 探针通过。
- [ ] staged/commit 范围逐任务核对，`.superpowers/`、报告、依赖目录和无关文件未提交。
