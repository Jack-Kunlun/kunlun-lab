# Task 6 Tool Registry and ToolShell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one validated internal-tool identity, an isolated four-state `ToolShell`, and a
build-time gate that rejects invalid manifests or checked-in works with unknown `toolId` values.

**Architecture:** `@kunlun/shared` owns the stable manifest type, while `@kunlun/tool-kit` owns
runtime validation and UI isolation. `@kunlun/jd-skill-radar` publishes one truthful draft
manifest now; a Node-safe validator imports that explicit manifest and checks work frontmatter
before every production build. Task 10 upgrades the same manifest instead of creating another
registry or ID catalog.

**Tech Stack:** TypeScript 6.0.3, Vue 3.5.41, Vitest 4.1.10, Vue Test Utils 2.4.11,
`@vitejs/plugin-vue` 6.0.8, Node 24 built-in test runner, YAML 2.9.0, pnpm 11.21.0, Turborepo
2.10.9.

## Global Constraints

- Read `E:\kunlun-lab\AGENTS.override.md` completely before each implementation or review task;
  never stage or commit it.
- Do not modify or migrate `E:\interview-notes`.
- Use TypeScript for authored code, strict TypeScript, strict type-aware ESLint, no explicit or
  implicit `any`, double quotes, semicolons, LF, UTF-8 without BOM, and a final newline.
- Git commits use repository-local identity `风岚 <1837115857@qq.com>`.
- Conventional Commit `type` and optional `scope` stay English; descriptions use Chinese except
  established English names.
- Do not push. Final integration must use `git merge --ff-only`; never create a merge commit.
- `ToolManifest` has one authoritative ID/title/runtime/status/capabilities/component record per
  tool. Do not introduce filesystem discovery, a second tool-ID catalog, or duplicate manifests.
- The Task 6 JD radar manifest is truthful: ID `jd-skill-radar`, title
  `前端岗位 JD 技能雷达`, runtime `client`, status `draft`, capabilities `[]`, and an async draft
  component. It must not claim that analysis is available.
- Task 10 upgrades the same manifest to `alpha`, capabilities `clipboard` and `download`, and the
  real `JdSkillRadar` component.
- Supported runtimes are exactly `client`; supported capabilities are exactly `clipboard` and
  `download`; archived manifests are invalid.
- Ordinary error UI must never render an exception message, stack, or internal marker.
- All state feedback uses visible text and semantic live-region behavior; state is never conveyed
  only by color.
- External dependency versions remain exact; internal dependencies use exactly `workspace:*`.

## File Responsibility Map

- `packages/shared/src/content.ts`: stable content and `ToolManifest` type contracts only.
- `packages/shared/src/index.ts`: public type exports for consumers.
- `packages/tool-kit/src/contract.ts`: runtime constants and `ToolShellState` used by validation and
  rendering.
- `packages/tool-kit/src/registry.ts`: pure runtime manifest validation, registry creation, and
  work-to-tool link validation.
- `packages/tool-kit/src/components/ToolShell.vue`: stable outer boundary and four-state viewport.
- `packages/tool-kit/src/index.ts`: browser-facing public exports.
- `packages/tools/jd-skill-radar/src/manifest.ts`: the one authoritative JD radar manifest.
- `packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue`: truthful non-interactive
  draft content.
- `scripts/lib/tool-validation.ts`: filesystem/YAML adapter that reads work metadata and invokes
  the pure registry boundary.
- `scripts/validate-tools.ts`: explicit production manifest list and CLI exit behavior.
- `scripts/validate-tools.test.ts`: temporary-directory tests for the build-time adapter.

---

### Task 1: Shared Manifest Contract and Pure Registry Validation

**Files:**
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/src/content.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/tool-kit/package.json`
- Modify: `packages/tool-kit/tsconfig.json`
- Create: `packages/tool-kit/src/contract.ts`
- Create: `packages/tool-kit/src/registry.ts`
- Create: `packages/tool-kit/src/registry.test.ts`
- Create: `packages/tool-kit/src/index.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces:
  `ToolCapability = "clipboard" | "download"`.
- Produces:
  `ToolRuntime = "client"`.
- Produces:
  `ToolManifest` with `id`, `title`, `runtime`, non-archived `status`, readonly capabilities, and
  `component: () => Promise<{ default: Component }>`.
- Produces:
  `createToolRegistry(manifests: readonly ToolManifest[]): ReadonlyMap<string, ToolManifest>`.
- Produces:
  `validateWorkToolLinks(works: readonly WorkToolLink[], registry: ReadonlyMap<string, ToolManifest>): void`.
- Produces:
  `WorkToolLink` with `title: string` and optional `toolId: string`.
- `@kunlun/tool-kit/registry` is a Node-safe package subpath and must not import `.vue` files.

- [ ] **Step 1: Add the shared type contract test imports and registry fixtures**

Create `packages/tool-kit/src/registry.test.ts` with a hand-authored valid manifest fixture. Cast
deliberately malformed runtime values through `unknown`, never through `any`:

```ts
import type { ToolManifest } from "@kunlun/shared";
import { defineComponent } from "vue";
import { describe, expect, it } from "vitest";
import { createToolRegistry, validateWorkToolLinks } from "./registry.ts";

const emptyComponent = defineComponent({
  render: () => null,
});

function manifest(id = "radar", overrides: Partial<ToolManifest> = {}): ToolManifest {
  return {
    capabilities: [],
    component: async () => ({ default: emptyComponent }),
    id,
    runtime: "client",
    status: "draft",
    title: "测试工具",
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing tests for valid registration and every manifest boundary**

Add separate tests with literal expected messages. Each test names the production mutation it
catches:

```ts
describe("createToolRegistry", () => {
  it("indexes a valid manifest by its stable ID", () => {
    const radar = manifest("jd-skill-radar");
    const registry = createToolRegistry([radar]);

    expect([...registry.keys()]).toEqual(["jd-skill-radar"]);
    expect(registry.get("jd-skill-radar")).toBe(radar);
  });

  it("rejects duplicate manifest IDs", () => {
    expect(() => createToolRegistry([manifest("radar"), manifest("radar")])).toThrow(
      "Duplicate tool id: radar",
    );
  });

  it.each([
    [manifest(""), "Tool id must be non-empty."],
    [manifest("Bad_ID"), "Invalid tool id: Bad_ID"],
    [manifest("radar", { title: " " }), "Tool title must be non-empty: radar"],
    [
      { ...manifest("radar"), runtime: "server" } as unknown as ToolManifest,
      "Unsupported tool runtime for radar: server",
    ],
    [
      { ...manifest("radar"), status: "archived" } as unknown as ToolManifest,
      "Unsupported tool status for radar: archived",
    ],
    [
      { ...manifest("radar"), capabilities: ["camera"] } as unknown as ToolManifest,
      "Unsupported capability for radar: camera",
    ],
    [
      manifest("radar", { capabilities: ["clipboard", "clipboard"] }),
      "Duplicate capability for radar: clipboard",
    ],
    [
      { ...manifest("radar"), component: null } as unknown as ToolManifest,
      "Invalid component loader for radar.",
    ],
  ])("rejects an invalid manifest", (invalidManifest, expectedMessage) => {
    expect(() => createToolRegistry([invalidManifest])).toThrow(expectedMessage);
  });
});
```

- [ ] **Step 3: Write failing work-link tests**

Cover works without an internal tool, valid links, and a missing link whose error includes both
the title and ID:

```ts
describe("validateWorkToolLinks", () => {
  it("accepts external works and registered internal tools", () => {
    const registry = createToolRegistry([manifest("jd-skill-radar")]);

    expect(() =>
      validateWorkToolLinks(
        [
          { title: "外部作品" },
          { title: "前端岗位 JD 技能雷达", toolId: "jd-skill-radar" },
        ],
        registry,
      ),
    ).not.toThrow();
  });

  it("rejects a work that references a missing tool", () => {
    expect(() =>
      validateWorkToolLinks(
        [{ title: "缺失工具作品", toolId: "missing" }],
        new Map<string, ToolManifest>(),
      ),
    ).toThrow('Unknown toolId "missing" in work "缺失工具作品".');
  });
});
```

- [ ] **Step 4: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/tool-kit test -- registry.test.ts
```

Expected: FAIL because `./registry.ts` and the shared `ToolManifest` export do not exist. The
failure must be a missing module/export, not a malformed test or environment error.

- [ ] **Step 5: Add the stable manifest contract to `@kunlun/shared`**

In `packages/shared/src/content.ts`, import `Component` as a type and add the exact stable types:

```ts
import type { Component } from "vue";

export type ToolCapability = "clipboard" | "download";
export type ToolRuntime = "client";

export interface ToolManifest {
  id: string;
  title: string;
  runtime: ToolRuntime;
  status: Exclude<PublishStatus, "archived">;
  capabilities: readonly ToolCapability[];
  component: () => Promise<{ default: Component }>;
}
```

Keep existing `WorkMeta`, `WorkType`, and `PublishStatus` unchanged. Export the three new types
from `packages/shared/src/index.ts`. Add exact peer dependency `"vue": "3.5.41"` to
`packages/shared/package.json`; do not add Vue runtime code.

- [ ] **Step 6: Define runtime constants without duplicating string unions**

Create `packages/tool-kit/src/contract.ts`:

```ts
import type { ToolCapability, ToolManifest, ToolRuntime } from "@kunlun/shared";

export const supportedToolCapabilities = new Set<string>(["clipboard", "download"]);
export const supportedToolRuntimes = new Set<string>(["client"]);
export const supportedToolStatuses = new Set<string>(["draft", "alpha", "beta", "maintained"]);
export const toolIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ToolShellState = "ready" | "loading" | "error" | "feedback";

export type { ToolCapability, ToolManifest, ToolRuntime };
```

Sets are typed as `string` so runtime validation can test malformed values without unsafe casts in
production code.

- [ ] **Step 7: Implement unknown-first runtime manifest validation**

Create `packages/tool-kit/src/registry.ts`. Keep the public signature typed, but validate each
value through an internal `unknown` boundary so invalid runtime data is genuinely rejected:

```ts
import type { ToolManifest } from "@kunlun/shared";
import {
  supportedToolCapabilities,
  supportedToolRuntimes,
  supportedToolStatuses,
  toolIdPattern,
} from "./contract.ts";

export interface WorkToolLink {
  title: string;
  toolId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertToolManifest(value: unknown): asserts value is ToolManifest {
  if (!isRecord(value)) {
    throw new TypeError("Tool manifest must be an object.");
  }

  const id = typeof value.id === "string" ? value.id : "";

  if (id.trim().length === 0) {
    throw new TypeError("Tool id must be non-empty.");
  }

  if (!toolIdPattern.test(id)) {
    throw new TypeError(`Invalid tool id: ${id}`);
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new TypeError(`Tool title must be non-empty: ${id}`);
  }

  if (typeof value.runtime !== "string" || !supportedToolRuntimes.has(value.runtime)) {
    throw new TypeError(`Unsupported tool runtime for ${id}: ${String(value.runtime)}`);
  }

  if (typeof value.status !== "string" || !supportedToolStatuses.has(value.status)) {
    throw new TypeError(`Unsupported tool status for ${id}: ${String(value.status)}`);
  }

  if (!Array.isArray(value.capabilities)) {
    throw new TypeError(`Tool capabilities must be an array: ${id}`);
  }

  const seenCapabilities = new Set<string>();

  value.capabilities.forEach((capability: unknown) => {
    if (typeof capability !== "string" || !supportedToolCapabilities.has(capability)) {
      throw new TypeError(`Unsupported capability for ${id}: ${String(capability)}`);
    }

    if (seenCapabilities.has(capability)) {
      throw new TypeError(`Duplicate capability for ${id}: ${capability}`);
    }

    seenCapabilities.add(capability);
  });

  if (typeof value.component !== "function") {
    throw new TypeError(`Invalid component loader for ${id}.`);
  }
}
```

Complete `createToolRegistry` with `forEach`, never a `for` loop. Validate before duplicate lookup,
then return the `Map` as `ReadonlyMap`:

```ts
export function createToolRegistry(
  manifests: readonly ToolManifest[],
): ReadonlyMap<string, ToolManifest> {
  const registry = new Map<string, ToolManifest>();

  manifests.forEach((manifest) => {
    assertToolManifest(manifest);

    if (registry.has(manifest.id)) {
      throw new TypeError(`Duplicate tool id: ${manifest.id}`);
    }

    registry.set(manifest.id, manifest);
  });

  return registry;
}

export function validateWorkToolLinks(
  works: readonly WorkToolLink[],
  registry: ReadonlyMap<string, ToolManifest>,
): void {
  works.forEach(({ title, toolId }) => {
    if (toolId === undefined) {
      return;
    }

    if (!registry.has(toolId)) {
      throw new TypeError(`Unknown toolId "${toolId}" in work "${title}".`);
    }
  });
}
```

- [ ] **Step 8: Expose Node-safe registry and browser-facing entrypoints**

Update `packages/tool-kit/package.json` with:

```json
"exports": {
  ".": "./src/index.ts",
  "./registry": "./src/registry.ts"
}
```

Change its `tsconfig.json` from an empty project to:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

Create `packages/tool-kit/src/index.ts`:

```ts
export type { ToolCapability, ToolManifest, ToolRuntime, ToolShellState } from "./contract.ts";
export { createToolRegistry, validateWorkToolLinks, type WorkToolLink } from "./registry.ts";
```

The `./registry` subpath remains free of `.vue` imports for Task 4's Node process.

- [ ] **Step 9: Update the lockfile and verify GREEN**

Run:

```powershell
$env:CI = "true"
pnpm.cmd install --no-frozen-lockfile
pnpm.cmd --filter @kunlun/tool-kit test -- registry.test.ts
pnpm.cmd --filter @kunlun/tool-kit typecheck
pnpm.cmd --filter @kunlun/shared typecheck
```

Expected: registry tests pass; both packages typecheck; the lockfile changes only for the shared
Vue peer/importer relationship required by `ToolManifest`.

- [ ] **Step 10: Run strict lint, format, and mutation checks**

Run:

```powershell
pnpm.cmd lint
pnpm.cmd format:check
git diff --check
```

Then perform two temporary mutations one at a time and restore each with `apply_patch`:

1. Remove the duplicate-ID throw; the duplicate-ID test must fail.
2. Remove the registry `has` check in `validateWorkToolLinks`; the missing-link test must fail.

Re-run the focused tests after restoration and require all tests to pass.

- [ ] **Step 11: Commit the shared contract and registry**

Verify identity, stage only Task 1 files, inspect `git diff --cached --check`, and commit:

```powershell
git add -- packages/shared packages/tool-kit pnpm-lock.yaml
git commit -m "feat(tool-kit): 定义工具清单与注册表"
```

---

### Task 2: Isolated Four-State ToolShell

**Files:**
- Modify: `packages/tool-kit/package.json`
- Modify: `packages/tool-kit/tsconfig.json`
- Modify: `packages/tool-kit/src/index.ts`
- Create: `packages/tool-kit/vitest.config.ts`
- Create: `packages/tool-kit/src/components/ToolShell.vue`
- Create: `packages/tool-kit/src/components/ToolShell.test.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ToolShellState` from `packages/tool-kit/src/contract.ts`.
- Produces: `ToolShell` with prop
  `state: "ready" | "loading" | "error" | "feedback"`, optional `error: unknown`, optional
  `feedback: string`, slots `default`, `loading`, `error`, `feedback`, and event `retry`.
- Produces stable outer `[data-tool-shell]` and replaceable `[data-tool-viewport]` boundaries.

- [ ] **Step 1: Write the failing ready/loading state tests**

Create `packages/tool-kit/src/components/ToolShell.test.ts` with Happy DOM and real Vue mounting:

```ts
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ToolShell from "./ToolShell.vue";

describe("ToolShell", () => {
  it("renders ready content inside the stable tool viewport", () => {
    const wrapper = mount(ToolShell, {
      props: { state: "ready" },
      slots: { default: "工具已就绪" },
    });

    expect(wrapper.get("[data-tool-shell]").exists()).toBe(true);
    expect(wrapper.get("[data-tool-viewport]").text()).toContain("工具已就绪");
  });

  it("renders default and custom loading content as polite status", () => {
    const defaultWrapper = mount(ToolShell, { props: { state: "loading" } });
    const customWrapper = mount(ToolShell, {
      props: { state: "loading" },
      slots: { loading: "正在准备本地工具" },
    });

    expect(defaultWrapper.get('[role="status"]').text()).toContain("工具正在加载");
    expect(defaultWrapper.get('[role="status"]').attributes("aria-live")).toBe("polite");
    expect(customWrapper.get('[role="status"]').text()).toContain("正在准备本地工具");
  });
});
```

- [ ] **Step 2: Write failing error, feedback, retry, and isolation tests**

Add tests that prove safe defaults and state replacement:

```ts
it("shows safe error copy and retry without internal exception details", async () => {
  const wrapper = mount(ToolShell, {
    props: { state: "error", error: new Error("internal stack marker") },
  });

  expect(wrapper.get('[role="alert"]').text()).toContain("工具暂时无法运行");
  expect(wrapper.text()).not.toContain("internal stack marker");
  await wrapper.get('[data-test="retry"]').trigger("click");
  expect(wrapper.emitted("retry")).toHaveLength(1);
});

it("renders feedback through a polite live region", () => {
  const wrapper = mount(ToolShell, {
    props: { feedback: "Markdown 已复制", state: "feedback" },
  });

  expect(wrapper.get('[role="status"]').text()).toContain("Markdown 已复制");
  expect(wrapper.get('[role="status"]').attributes("aria-live")).toBe("polite");
});

it("replaces only viewport content when state changes", async () => {
  const wrapper = mount(ToolShell, {
    props: { state: "ready" },
    slots: { default: "分析工作台" },
  });
  const shellElement = wrapper.get("[data-tool-shell]").element;

  await wrapper.setProps({ state: "error", error: new Error("hidden") });

  expect(wrapper.get("[data-tool-shell]").element).toBe(shellElement);
  expect(wrapper.get("[data-tool-viewport]").text()).not.toContain("分析工作台");
  expect(wrapper.text()).not.toContain("hidden");
});
```

Also add one named `error` slot and one named `feedback` slot test. The error slot receives no
exception object, preventing accidental stack exposure through slot props.

- [ ] **Step 3: Run the component test and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/tool-kit test -- ToolShell.test.ts
```

Expected: FAIL because Vue test compilation and `ToolShell.vue` do not exist. If the failure is
only “unknown `.vue` extension”, add the test configuration in Step 4 and re-run until the test
fails because the component is missing.

- [ ] **Step 4: Configure Vue component tests in the package**

Add exact dev dependency `"@vitejs/plugin-vue": "6.0.8"` to
`packages/tool-kit/package.json`. Create `packages/tool-kit/vitest.config.ts`:

```ts
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
});
```

Change the package `tsconfig.json` include array to
`["src/**/*.ts", "src/**/*.vue", "vitest.config.ts"]`.

- [ ] **Step 5: Implement the minimal four-state component**

Create `packages/tool-kit/src/components/ToolShell.vue` with typed props and emits:

```vue
<script setup lang="ts">
import type { ToolShellState } from "../contract.ts";

withDefaults(
  defineProps<{
    state: ToolShellState;
    error?: unknown;
    feedback?: string;
  }>(),
  {
    error: undefined,
    feedback: undefined,
  },
);

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <section class="tool-shell" data-tool-shell>
    <div class="tool-shell__viewport" data-tool-viewport>
      <slot v-if="state === 'ready'" />
      <div v-else-if="state === 'loading'" aria-live="polite" role="status">
        <slot name="loading">工具正在加载，请稍候。</slot>
      </div>
      <div v-else-if="state === 'error'" aria-live="assertive" role="alert">
        <slot name="error">
          <p>工具暂时无法运行，请稍后重试。</p>
          <button data-test="retry" type="button" @click="$emit('retry')">重试</button>
        </slot>
      </div>
      <div v-else aria-live="polite" role="status">
        <slot name="feedback">{{ feedback ?? "操作已完成。" }}</slot>
      </div>
    </div>
  </section>
</template>
```

Add scoped styles only for the shell boundary, spacing, and viewport. Reuse B1 CSS variables with
fallbacks; do not import page layout or render navigation/header elements inside the component.

- [ ] **Step 6: Export ToolShell without breaking the Node-safe subpath**

Append to `packages/tool-kit/src/index.ts`:

```ts
export { default as ToolShell } from "./components/ToolShell.vue";
```

Do not change `@kunlun/tool-kit/registry`; it must still resolve directly to `registry.ts`.

- [ ] **Step 7: Update dependencies and verify GREEN**

Run:

```powershell
$env:CI = "true"
pnpm.cmd install --no-frozen-lockfile
pnpm.cmd --filter @kunlun/tool-kit test -- ToolShell.test.ts
pnpm.cmd --filter @kunlun/tool-kit typecheck
pnpm.cmd lint
pnpm.cmd format:check
git diff --check
```

Expected: all ToolShell tests pass, exception details remain absent, retry emits once, strict
typecheck/lint/format pass.

- [ ] **Step 8: Run the error-disclosure mutation check**

Temporarily render `{{ String(error) }}` in the default error state, run the focused component
test, and require the safe-error test to fail on `internal stack marker`. Restore with
`apply_patch`, rerun the focused test, and require it to pass.

- [ ] **Step 9: Commit ToolShell**

Verify identity, stage only Task 2 files and lockfile, then commit:

```powershell
git add -- packages/tool-kit pnpm-lock.yaml
git commit -m "feat(tool-kit): 添加隔离工具容器"
```

---

### Task 3: Truthful JD Radar Draft Manifest

**Files:**
- Modify: `packages/tools/jd-skill-radar/package.json`
- Modify: `packages/tools/jd-skill-radar/tsconfig.json`
- Create: `packages/tools/jd-skill-radar/vitest.config.ts`
- Create: `packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue`
- Create: `packages/tools/jd-skill-radar/src/manifest.ts`
- Create: `packages/tools/jd-skill-radar/src/manifest.test.ts`
- Create: `packages/tools/jd-skill-radar/src/index.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `ToolManifest` from `@kunlun/shared`.
- Produces: `jdSkillRadarManifest` with exact draft identity and an async component loader.
- Produces: package export `@kunlun/jd-skill-radar` without a second ID list.

- [ ] **Step 1: Write the failing manifest identity and loader test**

Create `packages/tools/jd-skill-radar/src/manifest.test.ts`:

```ts
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createToolRegistry } from "@kunlun/tool-kit/registry";
import { jdSkillRadarManifest } from "./manifest.ts";

describe("jdSkillRadarManifest", () => {
  it("registers one truthful draft identity with no unavailable capabilities", () => {
    const registry = createToolRegistry([jdSkillRadarManifest]);

    expect(registry.get("jd-skill-radar")).toMatchObject({
      capabilities: [],
      id: "jd-skill-radar",
      runtime: "client",
      status: "draft",
      title: "前端岗位 JD 技能雷达",
    });
  });

  it("loads a non-interactive construction notice instead of claiming analysis is ready", async () => {
    const loadedComponent = await jdSkillRadarManifest.component();
    const wrapper = mount(loadedComponent.default);

    expect(wrapper.text()).toContain("工具仍在建设中");
    expect(wrapper.text()).not.toContain("开始分析");
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find("textarea").exists()).toBe(false);
  });
});
```

The first test fails if Task 10 identity is accidentally introduced early; the second fails if the
draft component makes a false availability promise.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test -- manifest.test.ts
```

Expected: FAIL because `manifest.ts` and its component do not exist. Resolve only test-environment
configuration errors before accepting RED.

- [ ] **Step 3: Configure package exports, Vue tests, and TypeScript scope**

Add to `packages/tools/jd-skill-radar/package.json`:

```json
"exports": {
  ".": "./src/index.ts"
},
"devDependencies": {
  "@vitejs/plugin-vue": "6.0.8",
  "@vue/test-utils": "2.4.11"
}
```

Keep all current workspace dependencies and Vue peer unchanged. Replace its empty `tsconfig.json`
with:

```json
{
  "extends": "../../../tsconfig.base.json",
  "include": ["src/**/*.ts", "src/**/*.vue", "vitest.config.ts"]
}
```

Create the same Vue Vitest configuration shown explicitly in Task 2, adjusted only by its local
path (no path fields are needed).

- [ ] **Step 4: Implement the draft component and single manifest**

Create `JdSkillRadarDraft.vue` as semantic, non-interactive content:

```vue
<template>
  <section aria-labelledby="jd-radar-draft-title">
    <p class="jd-radar-draft__status">DRAFT / LOCAL TOOL</p>
    <h2 id="jd-radar-draft-title">工具仍在建设中</h2>
    <p>前端岗位 JD 技能雷达正在实现中，当前暂不提供分析入口。</p>
  </section>
</template>
```

Create `manifest.ts`:

```ts
import type { ToolManifest } from "@kunlun/shared";

export const jdSkillRadarManifest = {
  capabilities: [],
  component: () => import("./components/JdSkillRadarDraft.vue"),
  id: "jd-skill-radar",
  runtime: "client",
  status: "draft",
  title: "前端岗位 JD 技能雷达",
} satisfies ToolManifest;
```

Create `index.ts` with only:

```ts
export { jdSkillRadarManifest } from "./manifest.ts";
```

- [ ] **Step 5: Update dependencies and verify GREEN**

Run:

```powershell
$env:CI = "true"
pnpm.cmd install --no-frozen-lockfile
pnpm.cmd --filter @kunlun/jd-skill-radar test -- manifest.test.ts
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd lint
pnpm.cmd format:check
git diff --check
```

Expected: 2 manifest tests pass; the async loader compiles and mounts; strict gates pass.

- [ ] **Step 6: Run the truthful-status mutation check**

Temporarily change the manifest to `status: "alpha"` and capabilities
`["clipboard", "download"]`. Run the focused test and require the identity assertion to fail.
Restore with `apply_patch`, rerun, and require both tests to pass.

- [ ] **Step 7: Commit the draft manifest**

Verify identity and commit only JD package files plus its lockfile changes:

```powershell
git add -- packages/tools/jd-skill-radar pnpm-lock.yaml
git commit -m "feat(jd-radar): 添加草稿工具清单"
```

---

### Task 4: Checked-In Work Validation and Root Build Gate

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `scripts/lib/tool-validation.ts`
- Create: `scripts/validate-tools.ts`
- Create: `scripts/validate-tools.test.ts`

**Interfaces:**
- Consumes: Node-safe `createToolRegistry` and `validateWorkToolLinks` from
  `@kunlun/tool-kit/registry`.
- Consumes: explicit `jdSkillRadarManifest` from `@kunlun/jd-skill-radar`.
- Produces:
  `readWorkToolLinks(worksDirectory: string): WorkToolLink[]`.
- Produces:
  `validateToolDirectory(worksDirectory: string, manifests: readonly ToolManifest[]): void`.
- Produces CLI output `Tool validation passed.` or
  `Tool validation failed: <specific error>` and a non-zero exit code.
- Produces root `prebuild` that runs content validation before tool validation.

- [ ] **Step 1: Expose package-name dependencies to root scripts**

Add these exact root `devDependencies`, alphabetically among `@kunlun/*` entries:

```json
"@kunlun/jd-skill-radar": "workspace:*",
"@kunlun/tool-kit": "workspace:*"
```

The script must import packages by name. Do not use relative imports into `packages/**/src`. Run:

```powershell
$env:CI = "true"
pnpm.cmd install --no-frozen-lockfile
```

Expected: root `node_modules/@kunlun/jd-skill-radar` and `node_modules/@kunlun/tool-kit` resolve to
their workspace packages, so the RED test can fail on the missing adapter rather than package
resolution.

- [ ] **Step 2: Write failing temporary-directory adapter tests**

Create `scripts/validate-tools.test.ts` using `node:test`, `node:assert/strict`, and real temporary
Markdown files. Do not mock filesystem or YAML:

```ts
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { validateToolDirectory } from "./lib/tool-validation.ts";

let fixtureDirectory = "";

beforeEach(() => {
  fixtureDirectory = mkdtempSync(path.join(tmpdir(), "kunlun-tools-"));
  mkdirSync(path.join(fixtureDirectory, "works"), { recursive: true });
});

afterEach(() => {
  rmSync(fixtureDirectory, { force: true, recursive: true });
});

function writeWork(fileName: string, title: string, toolId?: string): void {
  const toolIdLine = toolId === undefined ? "" : `toolId: ${toolId}\n`;

  writeFileSync(
    path.join(fixtureDirectory, "works", fileName),
    `---\ntitle: ${title}\n${toolIdLine}---\n\n# ${title}\n`,
    "utf8",
  );
}
```

Add tests:

```ts
void test("accepts checked-in works whose internal tools are explicitly registered", () => {
  writeWork("radar.md", "前端岗位 JD 技能雷达", "jd-skill-radar");
  writeWork("external.md", "外部作品");

  assert.doesNotThrow(() =>
    validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]),
  );
});

void test("reports the work title and unknown tool ID", () => {
  writeWork("missing.md", "缺失工具作品", "missing");

  assert.throws(
    () => validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]),
    /Unknown toolId "missing" in work "缺失工具作品"\./,
  );
});

void test("rejects duplicate explicit manifests before validating works", () => {
  assert.throws(
    () =>
      validateToolDirectory(path.join(fixtureDirectory, "works"), [
        jdSkillRadarManifest,
        jdSkillRadarManifest,
      ]),
    /Duplicate tool id: jd-skill-radar/,
  );
});

void test("reports malformed or missing work frontmatter", () => {
  writeFileSync(path.join(fixtureDirectory, "works", "broken.md"), "# 无 frontmatter\n", "utf8");

  assert.throws(
    () => validateToolDirectory(path.join(fixtureDirectory, "works"), [jdSkillRadarManifest]),
    /broken\.md: 缺少 YAML frontmatter。/,
  );
});
```

- [ ] **Step 3: Add the test to the repository runner and verify RED**

Add `scripts/validate-tools.test.ts` to root `test:repository` after the ESLint boundary test and
before existing policy tests. Run:

```powershell
node --test scripts/validate-tools.test.ts
```

Expected: FAIL with missing `scripts/lib/tool-validation.ts`. The test must successfully resolve
the already-committed JD manifest before reaching that missing helper.

- [ ] **Step 4: Implement deterministic frontmatter reading**

Create `scripts/lib/tool-validation.ts`. Use `readdirSync(..., { withFileTypes: true })`, recursive
`flatMap`, `.md` filtering, and sorted normalized paths, matching existing content-validator
determinism. Implement these helpers with exact behavior:

```ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { ToolManifest } from "@kunlun/shared";
import {
  createToolRegistry,
  validateWorkToolLinks,
  type WorkToolLink,
} from "@kunlun/tool-kit/registry";

function extractFrontmatter(content: string): string | undefined {
  if (!content.startsWith("---\n")) {
    return undefined;
  }

  const closingDelimiterIndex = content.indexOf("\n---\n", 4);

  return closingDelimiterIndex === -1 ? undefined : content.slice(4, closingDelimiterIndex);
}
```

Add deterministic Markdown discovery:

```ts
function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownFiles(entryPath);
      }

      return entry.isFile() && path.extname(entry.name).toLowerCase() === ".md" ? [entryPath] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRelativePath(rootDirectory: string, filePath: string): string {
  return path.relative(rootDirectory, filePath).replaceAll("\\", "/");
}
```

For each Markdown file:

- throw `<relative path>: 缺少 YAML frontmatter。` when delimiters are absent;
- parse YAML into `unknown`;
- require a non-empty string `title`;
- if `toolId` is present, require a non-empty string;
- include file path in YAML/type errors;
- return only `{ title }` or `{ title, toolId }`, never the whole content object.

Use this complete public reader shape; extract a private `readWorkToolLink` only if the same
messages and return values remain exact:

```ts
export function readWorkToolLinks(worksDirectory: string): WorkToolLink[] {
  return listMarkdownFiles(worksDirectory).map((filePath) => {
    const relativePath = normalizeRelativePath(worksDirectory, filePath);
    const frontmatterSource = extractFrontmatter(readFileSync(filePath, "utf8"));

    if (frontmatterSource === undefined) {
      throw new TypeError(`${relativePath}: 缺少 YAML frontmatter。`);
    }

    let frontmatter: unknown;

    try {
      frontmatter = parse(frontmatterSource);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new TypeError(`${relativePath}: YAML 解析失败：${message}`);
    }

    if (!isRecord(frontmatter)) {
      throw new TypeError(`${relativePath}: YAML frontmatter 必须是对象。`);
    }

    if (typeof frontmatter.title !== "string" || frontmatter.title.trim().length === 0) {
      throw new TypeError(`${relativePath}: title 必须是非空字符串。`);
    }

    if (frontmatter.toolId === undefined) {
      return { title: frontmatter.title };
    }

    if (typeof frontmatter.toolId !== "string" || frontmatter.toolId.trim().length === 0) {
      throw new TypeError(`${relativePath}: toolId 必须是非空字符串。`);
    }

    return { title: frontmatter.title, toolId: frontmatter.toolId };
  });
}
```

`validateToolDirectory` must create the registry before reading/validating work links so duplicate
manifest failures happen before content-reference failures:

```ts
export function validateToolDirectory(
  worksDirectory: string,
  manifests: readonly ToolManifest[],
): void {
  const registry = createToolRegistry(manifests);
  const works = readWorkToolLinks(worksDirectory);

  validateWorkToolLinks(works, registry);
}
```

- [ ] **Step 5: Implement the explicit CLI manifest list**

Create `scripts/validate-tools.ts`:

```ts
import path from "node:path";
import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { validateToolDirectory } from "./lib/tool-validation.ts";

function main(): void {
  const worksDirectory = path.resolve(process.cwd(), "apps/web/content/works");

  validateToolDirectory(worksDirectory, [jdSkillRadarManifest]);
  process.stdout.write("Tool validation passed.\n");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Tool validation failed: ${message}\n`);
  process.exitCode = 1;
}
```

The array literal is the sole production registration list at this stage.

- [ ] **Step 6: Connect content and tool validation to prebuild**

Add this exact root script:

```json
"prebuild": "node scripts/validate-content.ts && node scripts/validate-tools.ts"
```

Keep `build: "turbo build"`. Do not add tool validation to package build scripts or run it once per
workspace.

- [ ] **Step 7: Update workspace links and verify GREEN**

Run:

```powershell
$env:CI = "true"
pnpm.cmd install --no-frozen-lockfile
node --test scripts/validate-tools.test.ts
node scripts/validate-tools.ts
pnpm.cmd test:repository
```

Expected: adapter tests pass; checked-in work validation prints `Tool validation passed.`; the
repository runner includes all four new adapter tests.

- [ ] **Step 8: Run the required deliberate duplicate-manifest probe**

Use `apply_patch` to change only the production array in `scripts/validate-tools.ts` to:

```ts
[jdSkillRadarManifest, jdSkillRadarManifest]
```

Run `node scripts/validate-tools.ts` and require exit code 1 with
`Duplicate tool id: jd-skill-radar`. Immediately restore the single-entry array with
`apply_patch`, rerun the validator, and require exit code 0.

- [ ] **Step 9: Run the required checked-in missing-tool probe**

Use `apply_patch` to change only `toolId: jd-skill-radar` to `toolId: missing` in
`apps/web/content/works/jd-skill-radar.md`. Run `node scripts/validate-tools.ts` and require exit
code 1 containing both `前端岗位 JD 技能雷达` and `missing`. Restore the original ID with
`apply_patch`, rerun, and require exit code 0.

Confirm `git diff -- apps/web/content/works/jd-skill-radar.md` is empty before continuing.

- [ ] **Step 10: Run the complete Task 6 quality gate**

Run every command and require exit code 0:

```powershell
$env:CI = "true"
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter @kunlun/tool-kit test
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd validate
node scripts/validate-content.ts
node scripts/validate-tools.ts
pnpm.cmd build
git diff --check
```

Expected:

- frozen install reports the lockfile is current;
- registry, ToolShell, draft manifest, and adapter tests pass;
- lint has zero warnings and strict typechecks pass;
- content and tool validators pass;
- the production Nuxt build completes;
- existing upstream Nuxt/Nitro warnings may remain, but Task 6 introduces no warning.

- [ ] **Step 11: Audit package boundaries and scope**

Run:

```powershell
rg -n "jd-skill-radar" scripts/validate-tools.ts packages/tools/jd-skill-radar/src/manifest.ts apps/web/content/works/jd-skill-radar.md
rg -n "packages/.*/src|glob|fast-glob" scripts/validate-tools.ts scripts/lib/tool-validation.ts
git status --short
git diff --check
```

Expected: the first command shows the same stable ID in work metadata and the single manifest; the
second has no matches; no probe residue exists. Only Task 4 implementation files are uncommitted.

- [ ] **Step 12: Commit the build-time validator**

Verify identity, stage exact files, inspect the staged diff, and commit:

```powershell
git add -- package.json pnpm-lock.yaml scripts/lib/tool-validation.ts scripts/validate-tools.ts scripts/validate-tools.test.ts
git commit -m "build: 接入工具注册表校验"
```

---

### Task 5: Whole-Task Verification and Linear Integration Readiness

**Files:**
- Verify only; no new source files.

**Interfaces:**
- Consumes all Task 6 commits.
- Produces a clean feature branch eligible for final review and `git merge --ff-only`.

- [ ] **Step 1: Verify a clean frozen install**

Run:

```powershell
$env:CI = "true"
pnpm.cmd install --frozen-lockfile
git diff --exit-code -- package.json pnpm-lock.yaml
```

Expected: dependencies are current and neither manifest nor lockfile changes.

- [ ] **Step 2: Re-run the complete repository quality gate**

Run:

```powershell
pnpm.cmd validate:versions
pnpm.cmd validate:text
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
node scripts/validate-content.ts
node scripts/validate-tools.ts
pnpm.cmd build
```

Expected: all commands exit 0; all workspace and repository tests pass; production build completes.

- [ ] **Step 3: Verify public package entrypoints in Node and Vue contexts**

Run:

```powershell
node -e "import('@kunlun/tool-kit/registry').then(({ createToolRegistry }) => console.log(typeof createToolRegistry))"
node -e "import('@kunlun/jd-skill-radar').then(({ jdSkillRadarManifest }) => console.log(jdSkillRadarManifest.id))"
pnpm.cmd --filter @kunlun/tool-kit typecheck
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
```

Expected: Node prints `function` and `jd-skill-radar` without trying to load a `.vue` file; both Vue
packages typecheck.

- [ ] **Step 4: Audit Git history and prohibited patterns**

Run:

```powershell
git diff --check main...HEAD
git log --oneline main..HEAD
git rev-list --merges main..HEAD
git status --short
rg -n "\bany\b|config/eslint/base|fast-glob" packages/shared packages/tool-kit packages/tools/jd-skill-radar scripts
git check-ignore -v AGENTS.override.md
```

Expected: no whitespace errors, no merge commits, clean worktree, no authored `any`, no automatic
manifest discovery, and local override remains excluded by `.git/info/exclude`.

- [ ] **Step 5: Final review and integration**

Generate one review package from the branch fork point through `HEAD`. The final reviewer must
check this plan, the approved design, all implementation reports, the net diff, registry mutation
coverage, Node-safe entrypoints, error disclosure, and the draft-to-Task-10 upgrade path.

Only after an `APPROVED` verdict:

1. run the finishing-development-branch workflow;
2. confirm `main` still equals the fork point;
3. execute `git merge --ff-only codex/task-6-tool-kit` from the main worktree;
4. run `pnpm.cmd install --frozen-lockfile` and `pnpm.cmd test` on merged `main`;
5. confirm `git rev-list --merges <fork-point>..main` has no output;
6. remove only `E:\kunlun-lab\.worktrees\task-6-tool-kit` and delete its merged branch;
7. do not push.

## Self-Review Record

- **Spec coverage:** Every approved design section maps to a task: type/registry validation in
  Task 1, four-state isolation in Task 2, the truthful single draft manifest in Task 3, explicit
  work validation/build gating in Task 4, and cross-boundary verification in Task 5.
- **TDD:** Each production unit starts with a real behavior test and an observed missing-feature
  failure. Mutation probes cover duplicate IDs, missing work links, error disclosure, and premature
  capability/status claims.
- **Type consistency:** `ToolManifest`, `ToolCapability`, `ToolRuntime`, `ToolShellState`,
  `WorkToolLink`, `createToolRegistry`, `validateWorkToolLinks`, `readWorkToolLinks`, and
  `validateToolDirectory` keep the same names and signatures across all tasks.
- **Runtime boundary:** Node scripts import `@kunlun/tool-kit/registry`, which contains no `.vue`
  re-export. The browser-facing root entry may export `ToolShell`.
- **Scope:** No analyzer, export, workbench, dynamic discovery, route, micro-frontend, or false launch
  action is introduced.
- **Git:** Design/plan and four implementation commits remain linear; descriptions use Chinese;
  final integration is fast-forward only and never pushes.
