# Task 7 JD Skill Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a finite, deterministic JD skill dictionary with boundary-aware, non-overlapping alias matches and clause-local requirement tone evidence for Task 8.

**Architecture:** Keep the implementation inside pure TypeScript modules under the JD radar package. A static dictionary defines canonical skills, a matcher owns original-text positions and overlap resolution, and a tone module classifies only the match-local clause. Task 7 returns raw facts; Task 8 remains responsible for aggregation and scoring.

**Tech Stack:** TypeScript 6, Vitest 4, pnpm workspace, strict type-aware ESLint, Prettier.

## Global Constraints

- Fully read `E:\kunlun-lab\AGENTS.override.md` before every implementation or review task.
- Implement the approved design in `docs/superpowers/specs/2026-08-12-jd-skill-matching-design.md` exactly.
- TypeScript is strict; authored `any`, unsafe casts, JavaScript source, and lint-rule exemptions are forbidden.
- Use double quotes, semicolons, LF, UTF-8 without BOM, and final newlines.
- Preserve the draft `jdSkillRadarManifest` and Vue placeholder unchanged.
- Do not implement Task 8 aggregation, category scoring, overview extraction, checklist sorting, or the analysis pipeline.
- Do not modify or infer routes from `E:\interview-notes`.
- No new dependencies; all code is deterministic and browser-safe.
- Git identity is `风岚 <1837115857@qq.com>`.
- Conventional Commit `type`/`scope` remain English; descriptions use Chinese.
- Keep validation risk-proportional: one RED per task, one final GREEN, required mutation only, no repeated whole-repository gates or production build.
- Never push. Final integration is local `git merge --ff-only` only after approval and final validation.

---

### Task 1: Domain Contracts, Verified-Link Boundary, and Finite Dictionary

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/types.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/note-links.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts`

**Interfaces:**
- Produces `RequirementTone`, `SkillCategory`, `SkillDefinition`, and `RawSkillMatch` exactly as approved.
- Produces `VERIFIED_NOTE_LINKS: Readonly<Record<string, string>>` as an empty verified-link map.
- Produces `SKILLS: readonly SkillDefinition[]` with stable canonical IDs.
- Later tasks import these types and `SKILLS`; no second dictionary or ID catalog is allowed.

- [ ] **Step 1: Write the failing contract and dictionary test**

Create `skill-dictionary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VERIFIED_NOTE_LINKS } from "./note-links.ts";
import { SKILLS } from "./skill-dictionary.ts";

const expectedSkillIds = [
  "angular",
  "ci-cd",
  "code-review",
  "componentization",
  "css",
  "docker",
  "electron",
  "express",
  "git",
  "html",
  "javascript",
  "nextjs",
  "nodejs",
  "performance",
  "pinia",
  "react",
  "react-native",
  "rollup",
  "sass",
  "tailwind-css",
  "testing",
  "typescript",
  "uniapp",
  "vite",
  "vue",
  "vue-router",
  "webpack",
  "agile-collaboration",
].sort();

describe("SKILLS", () => {
  it("provides the finite v1 skills with stable unique IDs and aliases", () => {
    const ids = SKILLS.map(({ id }) => id);
    const aliases = SKILLS.flatMap(({ aliases: skillAliases }) => skillAliases.map(
      (alias) => alias.toLocaleLowerCase("en-US"),
    ));

    expect([...ids].sort()).toEqual(expectedSkillIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(SKILLS.every(({ aliases: skillAliases, checklistLabel, label }) =>
      skillAliases.length > 0 && checklistLabel.trim().length > 0 && label.trim().length > 0,
    )).toBe(true);
  });

  it("does not invent unverified knowledge-base links", () => {
    expect(VERIFIED_NOTE_LINKS).toEqual({});
    expect(SKILLS.every(({ noteUrl }) => noteUrl === undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test once and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/skill-dictionary.test.ts
```

Expected: FAIL because the domain modules do not exist. Accept no unrelated environment failure as RED.

- [ ] **Step 3: Define the exact public types**

Create `types.ts`:

```ts
export type RequirementTone = "required" | "preferred" | "familiar" | "neutral";

export type SkillCategory =
  | "language"
  | "framework"
  | "css"
  | "engineering"
  | "performance"
  | "nodejs"
  | "cross-platform"
  | "devops"
  | "collaboration";

export interface SkillDefinition {
  id: string;
  label: string;
  category: SkillCategory;
  aliases: readonly string[];
  checklistLabel: string;
  noteUrl?: string;
}

export interface RawSkillMatch {
  skillId: string;
  alias: string;
  start: number;
  end: number;
  context: string;
  tone: RequirementTone;
}
```

- [ ] **Step 4: Define an empty verified-link boundary**

Create `note-links.ts`:

```ts
export const VERIFIED_NOTE_LINKS: Readonly<Record<string, string>> = Object.freeze({});
```

Do not browse for arbitrary chapters and do not add a candidate URL. The approved design explicitly records that no reliable candidate is available.

- [ ] **Step 5: Implement the finite dictionary**

Create `skill-dictionary.ts` with an explicitly typed `readonly SkillDefinition[]`. Include exactly the IDs in the test and these canonical aliases:

```text
javascript: JavaScript, JS
typescript: TypeScript, TS
html: HTML, HTML5
css: CSS, CSS3
sass: Sass, SCSS
tailwind-css: Tailwind CSS, TailwindCSS
vue: Vue, Vue.js, Vue 3, Vue3
vue-router: Vue Router, VueRouter
pinia: Pinia
react: React, React.js
nextjs: Next.js, NextJS
angular: Angular
vite: Vite
webpack: Webpack
rollup: Rollup
testing: 单元测试, 自动化测试, E2E, Vitest, Jest, Cypress, Playwright
componentization: 组件化, 组件设计
performance: 性能优化, Web 性能, 前端性能
nodejs: Node.js, NodeJS
express: Express, Express.js
electron: Electron
react-native: React Native, ReactNative
uniapp: UniApp, uni-app, uniapp
docker: Docker
ci-cd: CI/CD, 持续集成, 持续交付
git: Git
code-review: Code Review, 代码评审, 代码审查
agile-collaboration: 敏捷开发, 敏捷协作, Scrum
```

Use Chinese checklist labels such as `复习 TypeScript 核心知识` or `准备 Vue 项目实践案例`. Assign categories exactly according to the approved design table. Spread `VERIFIED_NOTE_LINKS[id]` only when defined; because the map is empty, omit every `noteUrl` property rather than writing `undefined`.

- [ ] **Step 6: Run one final scoped GREEN and quality checks**

Run each once:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/skill-dictionary.test.ts
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/types.ts packages/tools/jd-skill-radar/src/domain/note-links.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain --check
git diff --check
```

Expected: 2 focused tests pass; package typecheck and strict file checks pass.

- [ ] **Step 7: Verify identity and commit Task 1**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/types.ts packages/tools/jd-skill-radar/src/domain/note-links.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts packages/tools/jd-skill-radar/src/domain/skill-dictionary.test.ts
git commit -m "feat(jd-radar): 添加有限技能词典"
```

---

### Task 2: Clause-Local Requirement Tone

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/detect-tone.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/detect-tone.test.ts`

**Interfaces:**
- Consumes `RequirementTone` from `types.ts`.
- Produces `detectTone(context: string): RequirementTone`.
- Task 3 calls this function with a single extracted clause, not the 80-character display context.

- [ ] **Step 1: Write the failing tone and precedence test**

Create `detect-tone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectTone } from "./detect-tone.ts";

describe("detectTone", () => {
  it.each([
    ["必须熟练掌握 TypeScript", "required"],
    ["岗位要求具备 Vue 项目经验", "required"],
    ["有 Node.js 经验优先，作为加分项", "preferred"],
    ["熟悉 Vue 生态", "familiar"],
    ["了解前端性能优化", "familiar"],
    ["具备 Express 开发经验", "familiar"],
    ["使用 Git 协作", "neutral"],
  ] as const)("detects %s", (context, tone) => {
    expect(detectTone(context)).toBe(tone);
  });

  it("uses fixed precedence when multiple signals appear", () => {
    expect(detectTone("熟悉并优先考虑精通 TypeScript 的候选人")).toBe("required");
  });
});
```

- [ ] **Step 2: Run the focused test once and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/detect-tone.test.ts
```

Expected: FAIL because `detect-tone.ts` does not exist.

- [ ] **Step 3: Implement explicit signal groups and precedence**

Create `detect-tone.ts` with readonly signal arrays:

```ts
const toneSignals = [
  { tone: "required", signals: ["必须", "要求", "熟练掌握", "精通", "必备"] },
  { tone: "preferred", signals: ["优先考虑", "优先", "加分项", "加分"] },
  { tone: "familiar", signals: ["具备经验", "有经验", "熟悉", "了解"] },
] as const satisfies readonly {
  tone: Exclude<RequirementTone, "neutral">;
  signals: readonly string[];
}[];
```

`detectTone` iterates in declared order and returns the first tone whose signal occurs in `context`; otherwise return `neutral`. Do not introduce scoring, regular-expression heuristics, English NLP, or aggregation.

- [ ] **Step 4: Run one final scoped GREEN and quality checks**

Run each once:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/detect-tone.test.ts
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/detect-tone.ts packages/tools/jd-skill-radar/src/domain/detect-tone.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain --check
git diff --check
```

- [ ] **Step 5: Commit the tone classifier**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/detect-tone.ts packages/tools/jd-skill-radar/src/domain/detect-tone.test.ts
git commit -m "feat(jd-radar): 添加局部要求语气判断"
```

---

### Task 3: Boundary-Aware Non-Overlapping Alias Matching

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/normalize.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/match-skills.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/match-skills.test.ts`

**Interfaces:**
- Consumes `SKILLS`, `RawSkillMatch`, and Task 2's `detectTone` public signature.
- Produces `matchSkills(text: string): RawSkillMatch[]`.
- Produces package-private helpers in `normalize.ts` for case-insensitive comparison, ASCII word characters, local clause extraction, and 80-character display context.
- Returned indices and aliases always refer to the original input string.

- [ ] **Step 1: Write failing exact-position and alias tests**

Create `match-skills.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { matchSkills } from "./match-skills.ts";

describe("matchSkills", () => {
  it("matches common aliases and preserves original text positions", () => {
    const text = "熟悉 Vue 3、TypeScript 和 Vite，具备 Node.js 服务开发经验";
    const matches = matchSkills(text);

    expect(matches.map(({ skillId }) => skillId)).toEqual([
      "vue",
      "typescript",
      "vite",
      "nodejs",
    ]);
    expect(matches.every(({ alias, end, start }) => text.slice(start, end) === alias)).toBe(true);
  });

  it("keeps repeated non-overlapping occurrences in original order", () => {
    const matches = matchSkills("Vue 项目迁移到 Vue 3");

    expect(matches.map(({ alias, skillId }) => ({ alias, skillId }))).toEqual([
      { alias: "Vue", skillId: "vue" },
      { alias: "Vue 3", skillId: "vue" },
    ]);
    expect(matches[0]?.start).toBeLessThan(matches[1]?.start ?? 0);
  });

  it("returns an empty result for empty or unrelated text", () => {
    expect(matchSkills("")).toEqual([]);
    expect(matchSkills("负责客户沟通与合同归档")).toEqual([]);
  });
});
```

- [ ] **Step 2: Write failing overlap and lexical-boundary tests**

Add:

```ts
it.each([
  ["维护 React Native 应用", ["react-native"]],
  ["使用 Vue Router 管理路由", ["vue-router"]],
  ["采用 Tailwind CSS 构建设计系统", ["tailwind-css"]],
])("prefers the longest alias without nested matches", (text, skillIds) => {
  expect(matchSkills(text).map(({ skillId }) => skillId)).toEqual(skillIds);
});

it("does not match aliases inside longer ASCII words", () => {
  expect(matchSkills("digital reactive GitLab workflow")).toEqual([]);
});

it("limits display context to 80 characters", () => {
  const matches = matchSkills(`${"a".repeat(60)} TypeScript ${"b".repeat(60)}`);

  expect(matches).toHaveLength(1);
  expect(matches[0]?.context.length).toBeLessThanOrEqual(80);
  expect(matches[0]?.context).toContain("TypeScript");
});
```

- [ ] **Step 3: Write the clause-isolation integration test**

Add:

```ts
it("detects tone from each local clause rather than shared display context", () => {
  const matches = matchSkills("熟悉 Vue，TypeScript 优先");

  expect(matches.map(({ skillId, tone }) => ({ skillId, tone }))).toEqual([
    { skillId: "vue", tone: "familiar" },
    { skillId: "typescript", tone: "preferred" },
  ]);
});
```

- [ ] **Step 4: Run the focused matcher test once and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/match-skills.test.ts
```

Expected: FAIL because `match-skills.ts` does not exist. Task 2 has already provided the real `detectTone` module; do not create a stub.

- [ ] **Step 5: Implement original-text helpers**

Create `normalize.ts` with these exports:

```ts
export const MAX_CONTEXT_LENGTH = 80;
export function foldForMatch(value: string): string;
export function isAsciiWordCharacter(value: string | undefined): boolean;
export function extractLocalClause(text: string, start: number, end: number): string;
export function extractDisplayContext(text: string, start: number, end: number): string;
```

`foldForMatch` uses `toLocaleLowerCase("en-US")` only and must preserve string length for the specified ASCII/Chinese aliases. `isAsciiWordCharacter` returns true only for `[A-Za-z0-9_]`.

`extractLocalClause` walks left and right from the match to the nearest delimiter in `\n\r，,。.;；!！?？`, excludes the delimiters, and trims outer whitespace.

`extractDisplayContext` returns at most 80 UTF-16 code units centered on the match. Calculate left and right budgets, then transfer unused budget to the other side before slicing. Trim outer whitespace after slicing; never rewrite the contents.

- [ ] **Step 6: Implement stable longest-first matching**

Create `match-skills.ts`:

1. Flatten `SKILLS` into `{ skillId, alias, foldedAlias }` candidates.
2. Sort candidates by `foldedAlias.length` descending, then `skillId`, then `foldedAlias`.
3. Scan the folded original with `indexOf`, advancing by at least one code unit so repeated occurrences are found.
4. For aliases containing ASCII letters or digits, reject a match when the character immediately before or after the candidate is an ASCII word character.
5. Reject a candidate interval if it overlaps any accepted interval.
6. Preserve `alias` using `text.slice(start, end)`.
7. Pass `extractLocalClause(...)` to `detectTone`; assign `extractDisplayContext(...)` to `context`.
8. Sort results by `start`, then `end`, then `skillId` before returning.

Do not merge same-skill occurrences or apply tone precedence here.

- [ ] **Step 7: Run the focused test and required overlap mutation**

Run once for GREEN:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/match-skills.test.ts
```

Then temporarily bypass only the accepted-interval overlap rejection. Run the same test and require at least one of the three longest-alias cases to fail with an extra short skill. Restore with `apply_patch` and rerun the focused test once; require all tests to pass.

- [ ] **Step 8: Run scoped quality checks and commit**

Run each once after the restored GREEN:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src/domain/normalize.ts packages/tools/jd-skill-radar/src/domain/match-skills.ts packages/tools/jd-skill-radar/src/domain/match-skills.test.ts --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src/domain --check
git diff --check
```

Commit:

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/normalize.ts packages/tools/jd-skill-radar/src/domain/match-skills.ts packages/tools/jd-skill-radar/src/domain/match-skills.test.ts
git commit -m "feat(jd-radar): 添加边界感知技能匹配"
```

---

### Task 4: Public Domain Entry and Task-Level Verification

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/index.ts`
- Modify: `packages/tools/jd-skill-radar/src/index.ts`

**Interfaces:**
- Package root continues exporting `jdSkillRadarManifest`.
- Package root additionally exports `SKILLS`, `matchSkills`, `detectTone`, `VERIFIED_NOTE_LINKS`, and all approved domain types.
- No Vue component is loaded when importing the package root in Node; the manifest retains only a lazy component function.

- [ ] **Step 1: Write the failing package-entry boundary test**

Create `packages/tools/jd-skill-radar/src/domain/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SKILLS,
  VERIFIED_NOTE_LINKS,
  detectTone,
  jdSkillRadarManifest,
  matchSkills,
} from "../index.ts";

describe("JD radar package entry", () => {
  it("exports the draft manifest and pure domain APIs together", () => {
    expect(jdSkillRadarManifest.id).toBe("jd-skill-radar");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(SKILLS.length).toBeGreaterThan(0);
    expect(matchSkills("TypeScript")).toHaveLength(1);
    expect(detectTone("必须掌握")).toBe("required");
    expect(VERIFIED_NOTE_LINKS).toEqual({});
  });
});
```

- [ ] **Step 2: Run the boundary test once and verify RED**

Run:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar exec vitest run src/domain/index.test.ts
```

Expected: FAIL because the package root has not exported domain APIs.

- [ ] **Step 3: Add domain and package exports**

Create `domain/index.ts` exporting:

```ts
export { detectTone } from "./detect-tone.ts";
export { matchSkills } from "./match-skills.ts";
export { VERIFIED_NOTE_LINKS } from "./note-links.ts";
export { SKILLS } from "./skill-dictionary.ts";
export type {
  RawSkillMatch,
  RequirementTone,
  SkillCategory,
  SkillDefinition,
} from "./types.ts";
```

Append this one line to package `src/index.ts`:

```ts
export * from "./domain/index.ts";
```

- [ ] **Step 4: Run the final Task 7 gate once**

Run each once:

```powershell
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src --check
git diff --check
node -e "import('@kunlun/jd-skill-radar').then(({ matchSkills }) => console.log(matchSkills('TypeScript').length))"
```

Expected: all JD package tests pass, strict typecheck/lint/format pass, Node prints `1` without loading the Vue draft component.

Do not run root `pnpm test`, `pnpm validate`, or production build for this isolated pure-domain task.

- [ ] **Step 5: Audit Task 7 scope and commit**

Run:

```powershell
rg -n "score|overview|checklist.*sort|analyzeJd|fetch|interview-notes" packages/tools/jd-skill-radar/src/domain
git status --short
git diff --check
```

Expected: no Task 8 pipeline, network access, local knowledge-base import, or probe residue. Only Task 4 files are uncommitted.

Commit:

```powershell
git add -- packages/tools/jd-skill-radar/src/domain/index.ts packages/tools/jd-skill-radar/src/domain/index.test.ts packages/tools/jd-skill-radar/src/index.ts
git commit -m "feat(jd-radar): 导出技能匹配领域接口"
```

---

### Task 5: Final Review and Linear Integration Readiness

**Files:**
- Verify only; do not modify implementation files unless final review reports a real defect.

**Interfaces:**
- Consumes all Task 7 commits.
- Produces a clean branch eligible for final review and local `git merge --ff-only`.

- [ ] **Step 1: Run one fresh branch verification**

Run once:

```powershell
$env:CI = "true"
pnpm.cmd install --frozen-lockfile
pnpm.cmd --filter @kunlun/jd-skill-radar test
pnpm.cmd --filter @kunlun/jd-skill-radar typecheck
pnpm.cmd exec eslint packages/tools/jd-skill-radar/src --max-warnings 0
pnpm.cmd exec prettier packages/tools/jd-skill-radar/src --check
git diff --check main...HEAD
```

- [ ] **Step 2: Audit exact scope and history**

Run once:

```powershell
git log --oneline main..HEAD
git rev-list --merges main..HEAD
git status --short
rg -n "\bany\b|fetch\(|interview-notes|analyzeJd|scoreCategories" packages/tools/jd-skill-radar/src/domain
git check-ignore -v AGENTS.override.md
```

Expected: linear history, clean worktree, no authored `any`, network access, local knowledge-base coupling, or Task 8 functions; override remains locally ignored.

- [ ] **Step 3: Independent final review**

Review the approved design, this plan, all task reports, mutation evidence, and the complete `main...HEAD` diff. Require no open P0-P2 before integration.

- [ ] **Step 4: Finish with the established local integration policy**

After final approval:

1. Confirm `main` still equals the branch fork point.
2. From `E:\kunlun-lab`, run `git merge --ff-only codex/task-7-jd-domain`.
3. Run one merged-result `pnpm.cmd --filter @kunlun/jd-skill-radar test`.
4. Confirm no merge commits and a clean `main`.
5. Remove only `E:\kunlun-lab\.worktrees\task-7-jd-domain` and delete the merged feature branch.
6. Do not push.

## Self-Review Record

- **Spec coverage:** Contracts and finite dictionary are Task 1; local tone is Task 2; original-index, boundaries, overlap, context, and clause isolation are Task 3; public Task 8-facing exports are Task 4; final evidence and linear integration are Task 5.
- **Dependency order:** Task 2 runs before Task 3 because `matchSkills` imports `detectTone`; the controller dispatch order is Task 1 → Task 2 → Task 3 → Task 4 → Task 5.
- **Type consistency:** `RequirementTone`, `SkillCategory`, `SkillDefinition`, `RawSkillMatch`, `SKILLS`, `detectTone`, `matchSkills`, and `VERIFIED_NOTE_LINKS` keep identical names and shapes across all tasks.
- **Scope:** No Task 8 aggregation, network request, guessed URL, UI change, dependency update, or knowledge-base mutation is included.
- **Validation:** Each production unit has a real RED/GREEN cycle; overlap logic has one mutation; repeated repository-wide checks and production builds are excluded.
