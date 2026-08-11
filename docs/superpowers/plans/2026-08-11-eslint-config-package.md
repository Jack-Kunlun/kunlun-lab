# ESLint Config Workspace Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库根目录中的可复用 ESLint 基础配置迁移为私有 workspace 包
`@kunlun/eslint-config`，同时保持现有 lint 行为不变。

**Architecture:** `packages/eslint-config` 拥有用户确认的基础规则、插件实现和别名重写
API；根 `eslint.config.ts` 继续组合 Vue、type-aware、projectService 和仓库路径配置。根项目
通过 `workspace:*` 和包名导入共享配置，不再引用 `config/eslint/base.ts`。

**Tech Stack:** pnpm workspace、Turborepo、TypeScript 6、ESLint 9 flat config、
typescript-eslint、eslint-plugin-import、eslint-plugin-unicorn、Node.js test runner。

## Global Constraints

- 每次实施前完整读取根 `AGENTS.override.md`；若存在普通 `AGENTS.md`，也完整读取。
- 不修改 `E:\interview-notes`。
- 所有手写源码使用 TypeScript，禁止 `any`，保持 strict TypeScript、双引号、LF 和现有
  `--max-warnings 0` 规则。
- 不修改、放宽或扩展用户已经确认的 `baseRules`。
- `@kunlun/eslint-config` 保持 private，不发布 npm，不加入未使用的 React/Node preset。
- Vue、type-aware rules、`projectService`、项目 glob 和 import resolver 仍由根
  `eslint.config.ts` 负责。
- 外部依赖继续锁定精确稳定版；workspace 依赖使用 `workspace:*`。
- 使用仓库本地身份 `风岚 <1837115857@qq.com>`，提交描述优先中文。
- 只允许通过 `git merge --ff-only` 线性更新 `main`；不得创建 merge commit 或自动推送。
- `AGENTS.override.md` 仅在本地更新，必须继续由 `.git/info/exclude` 忽略且不得暂存。

---

## Planned File Map

```text
packages/eslint-config/
├─ package.json           # 包名、exports、脚本、精确插件依赖和 ESLint peer
├─ tsconfig.json          # 继承全仓 strict TypeScript
└─ src/index.ts           # 原基础规则、插件实现、配置工厂和默认 flat config

eslint.config.ts          # 通过包名组合共享配置与仓库专属 TS/Vue 规则
tests/repository/
└─ eslint-config-package.test.ts  # 验证真实 workspace 导入与别名重写行为
```

删除 `config/eslint/base.ts`；如果 `config/eslint` 和 `config` 因此为空，也删除空目录。

---

### Task 1: Package Boundary Test and Workspace Migration

**Files:**
- Create: `tests/repository/eslint-config-package.test.ts`
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/tsconfig.json`
- Create: `packages/eslint-config/src/index.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Modify: `eslint.config.ts`
- Delete: `config/eslint/base.ts`

**Interfaces:**
- Produces package: `@kunlun/eslint-config`.
- Default export: `Linter.Config[]` containing the approved base flat config.
- Named exports: `baseRules`, `createBaseRulesConfig`, `js`, `tseslint`.
- Preserves signature:
  `createBaseRulesConfig(options?: BaseRulesOptions): Linter.Config`.
- Root consumer imports only from `@kunlun/eslint-config`.

- [ ] **Step 1: Write the failing workspace-boundary test**

Create `tests/repository/eslint-config-package.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import approvedBaseConfig, {
  createBaseRulesConfig,
} from "@kunlun/eslint-config";

void test("exports the approved base config through the workspace package", () => {
  assert.equal(approvedBaseConfig.at(-1)?.rules?.["no-console"], "error");
  assert.deepEqual(approvedBaseConfig.at(-1)?.rules?.quotes, ["error", "double"]);
});

void test("rewrites TypeScript plugin aliases and rule overrides", () => {
  const config = createBaseRulesConfig({
    files: ["**/*.ts"],
    pluginAliases: { "@typescript-eslint": "ts" },
    ruleOverrides: { "@typescript-eslint/no-explicit-any": "off" },
  });

  assert.deepEqual(config.files, ["**/*.ts"]);
  assert.ok(config.plugins?.ts);
  assert.equal(config.plugins?.["@typescript-eslint"], undefined);
  assert.equal(config.rules?.["ts/no-explicit-any"], "off");
});
```

- [ ] **Step 2: Run the boundary test and verify RED**

Run:

```powershell
node --test tests/repository/eslint-config-package.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `@kunlun/eslint-config`. The failure must come from
the missing workspace package, not a TypeScript syntax or assertion error.

- [ ] **Step 3: Create the package manifest and TypeScript project**

Create `packages/eslint-config/package.json`:

```json
{
  "name": "@kunlun/eslint-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@eslint/js": "9.39.5",
    "eslint-plugin-import": "2.32.0",
    "eslint-plugin-unicorn": "65.0.1",
    "typescript-eslint": "8.66.0"
  },
  "peerDependencies": {
    "eslint": "9.39.5"
  }
}
```

Create `packages/eslint-config/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Move the approved implementation without changing rules**

Create `packages/eslint-config/src/index.ts` from the complete current contents of
`config/eslint/base.ts`. Preserve every rule setting and these exports exactly:

```ts
export function createBaseRulesConfig({
  files = ["**/*.{ts,tsx,vue}"],
  pluginAliases = {},
  ruleOverrides = {},
}: BaseRulesOptions = {}): Linter.Config;

export { baseRules, js, tseslint };
export default approvedBaseConfig;
```

Delete `config/eslint/base.ts` only after the new package entry contains the complete
implementation. Do not keep a compatibility re-export at the old path because no external
consumer exists.

- [ ] **Step 5: Point the root config and TypeScript project at the package**

Replace the relative import in `eslint.config.ts`:

```ts
import approvedBaseConfig, {
  baseRules,
  createBaseRulesConfig,
  tseslint,
} from "@kunlun/eslint-config";
```

Remove `"config/**/*.ts"` from the root `tsconfig.json` include array. Keep
`"eslint.config.ts"`, scripts, and repository tests included.

- [ ] **Step 6: Move dependency ownership to the workspace package**

In the root `package.json`:

- add `"@kunlun/eslint-config": "workspace:*"` to `devDependencies`;
- remove root `@eslint/js`, `eslint-plugin-import`, `eslint-plugin-unicorn`, and
  `typescript-eslint` because the root no longer imports them directly;
- keep root `eslint`, `eslint-import-resolver-typescript`, `eslint-plugin-vue`, and
  `vue-eslint-parser` because the root config still owns those integrations;
- add `tests/repository/eslint-config-package.test.ts` to `test:repository` before the existing
  repository test files.

Run:

```powershell
pnpm.cmd install
```

Expected: `pnpm-lock.yaml` gains the `packages/eslint-config` importer, the root importer gains the
workspace link, and `node_modules/@kunlun/eslint-config` resolves to the new package.

- [ ] **Step 7: Run the boundary test and verify GREEN**

Run:

```powershell
node --test tests/repository/eslint-config-package.test.ts
```

Expected: 2 tests pass, 0 fail. Removing the workspace link, restoring the old relative import, or
breaking alias rewriting must make at least one check fail.

- [ ] **Step 8: Verify focused lint and type boundaries**

Run:

```powershell
pnpm.cmd --filter @kunlun/eslint-config typecheck
pnpm.cmd lint
pnpm.cmd typecheck
```

Expected: the new package typechecks, ESLint passes with zero warnings, and the root config resolves
all named exports from the package.

- [ ] **Step 9: Commit the package migration**

Verify identity before committing:

```powershell
git config --local --get user.name
git config --local --get user.email
```

Expected: `风岚` and `1837115857@qq.com`.

Commit only the migration files:

```powershell
git add -- packages/eslint-config tests/repository/eslint-config-package.test.ts package.json pnpm-lock.yaml tsconfig.json eslint.config.ts config/eslint/base.ts
git commit -m "refactor(eslint): 将基础配置迁移为工作区包"
```

---

### Task 2: Synchronize Architecture Documentation

**Files:**
- Modify: `docs/superpowers/plans/2026-08-10-personal-lab-v1.md`
- Modify locally only: `AGENTS.override.md`

**Interfaces:**
- Documents `packages/eslint-config` as the source of reusable lint policy.
- Preserves `eslint.config.ts` as the repository composition entry.
- Keeps `AGENTS.override.md` ignored and outside Git history.

- [ ] **Step 1: Correct the V1 planned file map and conventions**

In `docs/superpowers/plans/2026-08-10-personal-lab-v1.md`:

- replace `config/eslint/base.ts` in the planned file map with
  `packages/eslint-config/{package.json,tsconfig.json,src/index.ts}`;
- rename the Approved Code Conventions reference from `config/eslint/base.ts` to
  `packages/eslint-config/src/index.ts`;
- update Task 1's file list to create the package manifest, tsconfig, and entry instead of the old
  root file;
- add `@kunlun/eslint-config` to Task 1's produced workspace package names;
- update the Task 1 ESLint setup step so the root config consumes the package through
  `workspace:*` and a package-name import.

Do not change the approved rule code block or any unrelated product requirement.

- [ ] **Step 2: Correct the local architecture tree**

Add this project-specific entry under `packages/` in `AGENTS.override.md`:

```text
│  ├─ eslint-config/          # 可复用 ESLint 基础规则与插件配置
```

Run:

```powershell
git check-ignore -v AGENTS.override.md
```

Expected: `.git/info/exclude` is the matching source. Do not stage `AGENTS.override.md`.

- [ ] **Step 3: Validate documentation formatting and scope**

Run:

```powershell
pnpm.cmd validate:text
pnpm.cmd format:check
git diff --check
git status --short
```

Expected: all checks pass; Git shows only the V1 plan as a tracked documentation change, while
`AGENTS.override.md` remains absent from status.

- [ ] **Step 4: Commit the tracked documentation correction**

```powershell
git add -- docs/superpowers/plans/2026-08-10-personal-lab-v1.md
git commit -m "docs: 更新 ESLint 配置包架构"
```

---

### Task 3: Full Verification and Linear Integration

**Files:**
- Verify only; no new source files.

**Interfaces:**
- Consumes the two Task commits.
- Produces a clean, linear `main` with no merge commit and no remote push.

- [ ] **Step 1: Verify a frozen install from the updated lockfile**

Run:

```powershell
pnpm.cmd install --frozen-lockfile
```

Expected: the workspace package links without changing `package.json` or `pnpm-lock.yaml`.

- [ ] **Step 2: Run the complete quality gate**

Run each command and require exit code 0:

```powershell
pnpm.cmd validate:versions
pnpm.cmd validate:text
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
node scripts/validate-content.ts
pnpm.cmd build
```

Expected: all repository and workspace tests pass; lint has zero warnings; strict TypeScript passes;
Nuxt Content validates the checked-in entries; the production build completes. Existing upstream
Nuxt/Nitro warnings may be reported but must not be introduced by this migration.

- [ ] **Step 3: Audit the package boundary and Git scope**

Run:

```powershell
rg -n "config/eslint/base|\./config/eslint" eslint.config.ts package.json tsconfig.json packages tests
git diff --check main...HEAD
git status --short
git log --oneline main..HEAD
```

Expected: no code or documentation references the old path; the worktree is clean; the branch has
exactly the planned migration and documentation commits.

- [ ] **Step 4: Fast-forward main and verify the merged tree**

Use the feature branch name `codex/eslint-config-package`. From the clean main worktree, confirm
`main` still equals the feature branch's fork point, then run:

```powershell
$previousMain = git rev-parse main
git merge --ff-only codex/eslint-config-package
pnpm.cmd test
git rev-list --merges "$previousMain..main"
git status --short --branch
```

Expected: Git reports `Fast-forward`; merged tests pass; the merge query returns no commits; local
`main` is clean and ahead of `origin/main`; nothing is pushed.

---

## Self-Review Record

- **Spec coverage:** Package ownership, root-only Vue/type-aware configuration, stable exports,
  exact dependencies, workspace import, old-path removal, local context correction, testing and
  non-goals all map to Tasks 1–3.
- **TDD:** The first implementation action is a package-name import test that fails because the
  workspace package is absent, then passes only after the package boundary and alias behavior exist.
- **Type consistency:** The plan preserves the current `BaseRulesOptions`,
  `createBaseRulesConfig`, `baseRules`, `js`, and `tseslint` interfaces without renaming.
- **Scope:** No new presets, rule changes, package publication, Vue extraction, or unrelated source
  refactor is included.
- **Git:** Commits use Chinese descriptions, integration is `--ff-only`, and no push is authorized.
