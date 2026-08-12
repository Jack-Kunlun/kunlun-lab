# Personal Lab V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建一个可通过 Docker 部署的“个人主页 + 技术产品实验室”，包含内容驱动的首页、作品、文章、关于页面，以及完全在浏览器本地运行的“前端岗位 JD 技能雷达”。

**Architecture:** 使用 pnpm workspace 与 Turborepo 管理一个 Nuxt Content 主应用和四类聚焦包：`ui` 提供设计令牌与展示组件，`shared` 提供跨包类型和纯函数，`tool-kit` 提供工具清单、注册表与隔离容器，`jd-skill-radar` 提供领域分析、状态与 Vue 工作台。内容与内部工具通过稳定的 `toolId` 连接；构建前校验内容引用和工具注册表，单个工具通过异步边界与错误边界隔离。

**Tech Stack:** Node.js 最新 LTS、Corepack、pnpm、Turborepo、Nuxt、Vue、Nuxt Content、TypeScript、Zod、ESLint flat config、typescript-eslint、eslint-plugin-unicorn、eslint-plugin-import、eslint-plugin-vue、Prettier、Vitest、Vue Test Utils、Playwright、axe-core、Docker Compose。

## Global Constraints

- 每次执行计划前完整读取仓库根目录 `AGENTS.override.md`；若新增普通 `AGENTS.md`，也完整读取并同时遵守。
- 不修改、迁移、复制或同步 `E:\interview-notes`；仅把其公开应用 URL 或已核验章节 URL 写入新站元数据。
- 设计基线是 B1“控制台仪表盘”：深色石墨、低对比网格、高亮绿色主交互、少量紫色实验状态、技术标识用等宽字体、中文正文用系统无衬线字体。
- 主导航严格为“首页 / 作品 / 文章 / 关于”，不新增“实验室”或“合作”导航项。
- 文章详情降低网格、卡片和状态密度；工具页与索引页允许较高信息密度。
- 所有交互必须支持键盘、可见焦点、合理对比度、非颜色状态文本和 `prefers-reduced-motion`。
- 所有手写应用源码、配置脚本、校验脚本和测试统一使用 TypeScript（`.ts` / `.tsx` / `.vue`）；禁止新增手写 `.js`、`.jsx`、`.mjs` 或 `.cjs`。Nuxt/Nitro、依赖包和构建工具生成的 JavaScript 产物不受此限制。
- TypeScript 必须开启 `strict`、`noImplicitAny`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`useUnknownInCatchVariables`、`noImplicitOverride`、`noFallthroughCasesInSwitch` 和 `noEmit`；生产代码与测试均禁止显式或隐式 `any`。
- ESLint 使用用户确认的 `@eslint/js` + `typescript-eslint` + `eslint-plugin-unicorn` + `eslint-plugin-import` 基础规则，并扩展 Vue flat config 与 type-aware strict rules；命令固定为 `eslint . --max-warnings 0`，warning 也视为失败。
- 代码风格统一为 UTF-8（无 BOM）、LF、2 空格缩进、双引号、分号、尾逗号、100 字符打印宽度和文件末尾换行；由 `.editorconfig`、`.gitattributes`、Prettier 与 CI 共同校验。
- Git 工作区设置 `core.autocrlf=false` 与 `core.eol=lf`；`.gitattributes` 对所有文本强制 `eol=lf`，确保 Windows、Linux 与 macOS 无差异切换。
- `interview-notes` 的主要操作指向 `https://www.kunlunmarket.work/`；源码只在 `sourceUrl` 存在时作为次级操作。
- JD 仅接受一份粘贴的纯文本，不接受简历、PDF、Word、图片或多份 JD；分析、清单和 Markdown 导出全部在浏览器内完成，不上传、不记录、不默认跨会话保存。
- 技能分值只表示当前 JD 文本的强调程度，不表示岗位质量、用户能力或面试结果。
- 空白、过短、超长和无技能命中必须返回明确、可恢复的界面状态；无法解析字段统一显示“未识别”；用户界面不得显示内部堆栈。
- 首版不实现登录、会员、支付、评论、后台、AI 聊天、模型聚合、简历匹配、多 JD 对比、AI 分析、运行时微前端、域名迁移、ICP 或具体云平台配置。
- 实施当天从官方渠道核验 Node.js、pnpm、Nuxt、Nuxt Content、Turborepo、Vitest、Playwright 等最新正式稳定版；拒绝 beta、RC、nightly、canary；所有直接依赖锁定精确版本并提交 `pnpm-lock.yaml`。
- CI、本地与 Docker 使用相同 Node 主版本；Docker 基础镜像使用明确版本的 Debian slim Node LTS 标签，不使用 `latest`。
- 每个任务先写会因缺失行为而失败的测试，再写最小实现，最后运行本任务验证和受影响的回归验证。
- `AGENTS.override.md` 只加入 `.git/info/exclude`，不得加入共享 `.gitignore`，不得提交。

---

## Planned File Map

```text
personal-lab/
├─ .dockerignore                         # Docker 构建上下文边界
├─ .editorconfig                         # UTF-8、LF、2 空格和末尾换行
├─ .env.example                          # 公开的运行时变量说明
├─ .gitattributes                        # 仓库文本统一归一化为 LF
├─ .github/
│  ├─ dependabot.yml                     # 只创建升级 PR，不自动合并
│  └─ workflows/ci.yml                   # Node 主版本与 Docker 验证
├─ apps/web/
│  ├─ app.vue                            # 全局布局入口与工具异常兜底
│  ├─ assets/css/main.css                # 页面层布局、阅读态和响应式规则
│  ├─ components/                        # 导航、内容卡片、状态与列表
│  ├─ composables/                       # 作品动作与内容查询适配
│  ├─ content/{articles,works,pages}/     # Git 管理的首版内容
│  ├─ content.config.ts                  # 三个集合及 frontmatter schema
│  ├─ layouts/default.vue                # 四项导航与页脚
│  ├─ middleware/tool-id.global.ts       # 内部工具路由存在性保护
│  ├─ nuxt.config.ts                     # Content、CSS、SEO 与运行配置
│  ├─ pages/                             # 首页、作品、文章、关于、工具详情
│  ├─ plugins/tool-registry.ts           # 向 Nuxt 提供已校验注册表
│  ├─ server/api/health.get.ts           # 容器健康检查
│  └─ tests/                             # Nuxt 组件与页面集成测试
├─ packages/shared/
│  └─ src/{content,links,result}.ts       # 内容类型、动作决策、Result 类型
├─ packages/ui/
│  ├─ src/components/                    # Button、Badge、Panel、Metric 等
│  └─ src/styles/{tokens,base}.css        # B1 设计令牌与无障碍基线
├─ packages/tool-kit/
│  └─ src/{contract,registry,ToolShell}.ts|vue
├─ packages/eslint-config/{package.json,tsconfig.json,src/index.ts} # 可复用 ESLint 基础规则与插件配置
├─ packages/tools/jd-skill-radar/
│  ├─ src/domain/                        # 字典、匹配、语气、概览、评分、导出
│  ├─ src/state/useJdRadar.ts             # 明确的工作台状态机
│  ├─ src/components/                    # 输入、结果、清单与主工作台
│  └─ src/manifest.ts                    # 工具清单与异步组件入口
├─ tests/e2e/                            # 关键用户路径、无障碍与响应式
├─ scripts/                              # TypeScript 版本、格式、注册表和内容校验
├─ Dockerfile                            # prune/build/runtime 多阶段镜像
├─ compose.yaml                          # 一键部署与健康检查
├─ eslint.config.ts                      # type-aware TS/Vue 严格 ESLint
├─ package.json                          # 根脚本和 packageManager 锁定
├─ pnpm-workspace.yaml
├─ prettier.config.ts                    # 双引号、分号、LF 等格式规范
├─ tsconfig.base.json                    # 全仓严格 TS 编译器选项
├─ tsconfig.json                         # 根工具脚本与测试的 TS 校验入口
└─ turbo.json
```

## Approved Code Conventions

All authored examples and implementation files follow these settings. Generated Nuxt/Nitro output may contain JavaScript because it is not maintained source.

`tsconfig.base.json` compiler options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

`prettier.config.ts`:

```ts
import type { Config } from "prettier";

export default {
  endOfLine: "lf",
  printWidth: 100,
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
} satisfies Config;
```

`.editorconfig` and `.gitattributes`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
max_line_length = 100
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.ico binary
*.woff binary
*.woff2 binary
```

`packages/eslint-config/src/index.ts` preserves the user-approved rules and helper behavior, adding TypeScript annotations without weakening any rule:

```ts
import js from "@eslint/js";
import type { Linter } from "eslint";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const pluginImplementations = {
  "@typescript-eslint": tseslint.plugin,
  import: eslintPluginImport,
  unicorn: eslintPluginUnicorn,
} as const;

const baseRules = {
  "no-await-in-loop": "error",
  "no-empty-function": "error",
  "no-useless-catch": "error",
  "no-var": "error",
  "no-console": "error",
  "no-debugger": "error",
  "arrow-body-style": "off",
  "prefer-arrow-callback": "off",
  semi: ["error", "always"],
  quotes: ["error", "double"],
  eqeqeq: ["error", "always"],
  "object-shorthand": ["error", "always"],
  "no-sequences": ["error", { allowInParentheses: false }],
  "prefer-template": "error",
  curly: "error",
  "padding-line-between-statements": [
    "error",
    {
      blankLine: "always",
      prev: ["function", "class", "const", "let", "var", "block-like"],
      next: "*",
    },
    { blankLine: "always", prev: "*", next: ["return", "block-like"] },
    { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
  ],
  "padded-blocks": ["error", "never"],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      args: "all",
      argsIgnorePattern: "^_",
      caughtErrors: "all",
      caughtErrorsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      ignoreRestSiblings: true,
    },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "off",
  "unicorn/no-for-loop": "error",
  "unicorn/consistent-function-scoping": "error",
  "unicorn/explicit-length-check": "error",
  "unicorn/prefer-array-find": "error",
  "unicorn/prefer-includes": "error",
  "unicorn/prefer-string-slice": "error",
  "unicorn/consistent-destructuring": "error",
  "unicorn/no-nested-ternary": "error",
  "import/order": [
    "error",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
      pathGroups: [{ pattern: "~/**", group: "internal" }],
      alphabetize: { order: "asc", caseInsensitive: true },
      "newlines-between": "never",
    },
  ],
  "import/named": "error",
  "import/no-duplicates": "error",
  "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
  "import/newline-after-import": "error",
} satisfies Linter.RulesRecord;

type PluginName = keyof typeof pluginImplementations;
type PluginAliases = Partial<Record<PluginName, string>>;

interface BaseRulesOptions {
  files?: string[];
  pluginAliases?: PluginAliases;
  ruleOverrides?: Linter.RulesRecord;
}

function rewriteRuleId(ruleId: string, aliases: Readonly<Record<string, string>>): string {
  const separatorIndex = ruleId.indexOf("/");

  if (separatorIndex === -1) {
    return ruleId;
  }

  const pluginName = ruleId.slice(0, separatorIndex);
  const alias = aliases[pluginName];

  return alias === undefined ? ruleId : `${alias}${ruleId.slice(separatorIndex)}`;
}

function rewriteRules(
  rules: Readonly<Linter.RulesRecord>,
  aliases: Readonly<Record<string, string>>,
): Linter.RulesRecord {
  return Object.fromEntries(
    Object.entries(rules).map(([ruleId, setting]) => [rewriteRuleId(ruleId, aliases), setting]),
  );
}

export function createBaseRulesConfig({
  files = ["**/*.{ts,tsx,vue}"],
  pluginAliases = {},
  ruleOverrides = {},
}: BaseRulesOptions = {}): Linter.Config {
  const aliases = Object.fromEntries(
    Object.keys(pluginImplementations).map((pluginName) => [
      pluginName,
      pluginAliases[pluginName as PluginName] ?? pluginName,
    ]),
  );
  const plugins = Object.fromEntries(
    Object.entries(pluginImplementations).map(([pluginName, implementation]) => [
      aliases[pluginName] ?? pluginName,
      implementation,
    ]),
  );

  return {
    files,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins,
    rules: {
      ...rewriteRules(baseRules, aliases),
      ...rewriteRules(ruleOverrides, aliases),
    },
  };
}

const approvedBaseConfig = [
  {
    ignores: ["node_modules", "dist", "build", ".next", "coverage", "*.min.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  createBaseRulesConfig(),
] satisfies Linter.Config[];

export { baseRules, js, tseslint };
export default approvedBaseConfig;
```

`eslint.config.ts` starts with the exported approved base config, then composes `typescript-eslint` strict type-checked presets and Vue flat recommended config. Its final override keeps every approved base rule and additionally sets `parserOptions.projectService: true`, the TypeScript import resolver, `@typescript-eslint/no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return`, `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, and `consistent-type-imports` to `error`. It also prohibits `@ts-ignore`; a narrowly scoped `@ts-expect-error` requires a description of at least 10 characters.

## Shared Domain Contracts

这些签名是后续任务之间的稳定边界；若实现时必须调整，先修改本计划并重新检查所有消费者。

```ts
export type WorkType = "project" | "tool" | "experiment";
export type PublishStatus = "draft" | "alpha" | "beta" | "maintained" | "archived";

export interface WorkMeta {
  title: string;
  description: string;
  type: WorkType;
  status: PublishStatus;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  appUrl?: string;
  sourceUrl?: string;
  caseStudyUrl?: string;
  toolId?: string;
}

export interface ToolManifest {
  id: string;
  title: string;
  runtime: "client";
  status: Exclude<PublishStatus, "archived">;
  capabilities: readonly ("clipboard" | "download")[];
  component: () => Promise<{ default: Component }>;
}

export type JdInputErrorCode = "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "NO_SKILLS";
export type RequirementTone = "required" | "familiar" | "preferred" | "neutral";
export type SkillCategory =
  | "language"
  | "framework"
  | "css"
  | "engineering"
  | "performance"
  | "node"
  | "cross-platform"
  | "devops"
  | "collaboration";

export interface JdAnalysis {
  overview: {
    role: string;
    experience: string;
    education: string;
    location: string;
    primaryFrameworks: string[];
  };
  categories: Array<{ category: SkillCategory; score: number; matchCount: number }>;
  keywords: Array<{
    skillId: string;
    label: string;
    category: SkillCategory;
    count: number;
    tone: RequirementTone;
    contexts: string[];
  }>;
  checklist: Array<{ id: string; label: string; noteUrl?: string }>;
  meta: { characterCount: number; skillCount: number; categoryCount: number };
}

export type AnalyzeJdResult =
  | { ok: true; value: JdAnalysis }
  | { ok: false; error: { code: JdInputErrorCode; message: string } };
```

---

### Task 1: Repository Gate, Version Audit, and Workspace Skeleton

**Files:**
- Create: `.git/info/exclude` after `git init` (local metadata; never stage)
- Create: `.nvmrc`
- Create: `.node-version`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`
- Create: `.editorconfig`
- Create: `.gitattributes`
- Create: `.npmrc`
- Create: `.prettierignore`
- Create: `prettier.config.ts`
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/tsconfig.json`
- Create: `packages/eslint-config/src/index.ts`
- Create: `eslint.config.ts`
- Create: `.gitignore`
- Create: `scripts/verify-versions.ts`
- Create: `scripts/verify-text-format.ts`
- Create: `scripts/lib/version-policy.ts`
- Create: `scripts/lib/text-policy.ts`
- Create: `packages/{shared,ui,tool-kit}/package.json`
- Create: `packages/{shared,ui,tool-kit}/tsconfig.json`
- Create: `packages/tools/jd-skill-radar/package.json`
- Create: `packages/tools/jd-skill-radar/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Test: `tests/repository/version-policy.test.ts`
- Test: `tests/repository/text-policy.test.ts`

**Interfaces:**
- Produces: root commands `dev`, `build`, `test`, `test:unit`, `test:e2e`, `typecheck`, `lint`, `format`, `format:check`, `validate`, `validate:versions`, `validate:text`.
- Produces: workspace package names `@kunlun/shared`, `@kunlun/ui`, `@kunlun/tool-kit`, `@kunlun/eslint-config`, `@kunlun/jd-skill-radar`, `@kunlun/web`.

- [ ] **Step 1: Re-read local instructions and initialize repository metadata**

Run on 2026-08-10, and repeat on the actual implementation day before creating manifests:

```powershell
Get-Content -Raw -Encoding utf8 .\AGENTS.override.md
git init
Add-Content -Encoding utf8 .\.git\info\exclude "AGENTS.override.md"
git config core.autocrlf false
git config core.eol lf
git check-ignore -v AGENTS.override.md
```

Expected: the last command attributes the ignore rule to `.git/info/exclude`; `AGENTS.override.md` remains present and untracked.

- [ ] **Step 2: Resolve stable versions from official release channels**

Run:

```powershell
node --version
npm.cmd view pnpm version
npm.cmd view turbo version
npm.cmd view nuxt version
npm.cmd view @nuxt/content version
npm.cmd view vue version
npm.cmd view typescript version
npm.cmd view vitest version
npm.cmd view @playwright/test version
npm.cmd view zod version
npm.cmd view @vue/test-utils version
npm.cmd view @nuxt/test-utils version
npm.cmd view happy-dom version
npm.cmd view axe-core version
npm.cmd view @axe-core/playwright version
npm.cmd view eslint version
npm.cmd view @eslint/js version
npm.cmd view typescript-eslint version
npm.cmd view eslint-plugin-unicorn version
npm.cmd view eslint-plugin-import version
npm.cmd view eslint-import-resolver-typescript version
npm.cmd view eslint-plugin-vue version
npm.cmd view vue-eslint-parser version
npm.cmd view prettier version
npm.cmd view tsx version
npm.cmd view vue-tsc version
npm.cmd view @types/node@24 version --json
```

Expected: each npm query returns stable semantic versions with no prerelease suffix. The implementation-day compatible baseline is Node `24.19.0`, pnpm `11.21.0`, Turborepo `2.10.9`, Nuxt `4.5.2`, Nuxt Content `3.15.2`, Vue `3.5.41`, TypeScript `6.0.3`, Vitest `4.1.10`, Playwright `1.62.1`, Zod `4.4.3`, Vue Test Utils `2.4.11`, Nuxt Test Utils `4.1.0`, happy-dom `20.11.2`, axe-core `4.13.0`, axe-core Playwright `4.12.1`, ESLint `9.39.5`, `@eslint/js` `9.39.5`, typescript-eslint `8.66.0`, eslint-plugin-unicorn `65.0.1`, eslint-plugin-import `2.32.0`, eslint-import-resolver-typescript `4.4.5`, eslint-plugin-vue `10.10.0`, vue-eslint-parser `10.4.1`, Prettier `3.9.6`, vue-tsc `3.3.9`, Jiti `2.7.0`, and Node 24 typings `24.13.3`. TypeScript 7, ESLint 10, and unicorn 66+ are intentionally not selected because they exceed the compatible peer intersection of typescript-eslint 8.66, eslint-plugin-import 2.32, and the approved unicorn rules. `tsx` is not a direct dependency because Node 24 runs the repository's erasable TypeScript scripts natively; pnpm's transitive `tsx@4.23.12` build dependency is recorded only in the workspace supply-chain exception. Cross-check Node against `https://nodejs.org/en/about/previous-releases`; use Node 24 while it remains the latest LTS, not Node 26 while it remains Current. If any stable compatible release changes before implementation, update every occurrence in this task, `.node-version`, `.nvmrc`, manifests, lockfile, CI, and Docker together before the first commit.

- [ ] **Step 3: Write the failing repository policy test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

interface RootPackage {
  packageManager: string;
  engines: { node: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function assertRootPackage(value: unknown): asserts value is RootPackage {
  assert.ok(isRecord(value));
  assert.equal(typeof value.packageManager, "string");
  assert.ok(isRecord(value.engines));
  assert.equal(typeof value.engines.node, "string");
  assert.ok(value.dependencies === undefined || isStringRecord(value.dependencies));
  assert.ok(value.devDependencies === undefined || isStringRecord(value.devDependencies));
}

test("pins all direct dependencies and one Node major", async () => {
  const root: unknown = JSON.parse(await readFile("package.json", "utf8"));
  assertRootPackage(root);
  assert.match(root.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
  assert.match(root.engines.node, /^\d+\.x$/);

  for (const section of ["dependencies", "devDependencies"] as const) {
    for (const [name, version] of Object.entries(root[section] ?? {})) {
      if (name.startsWith("@kunlun/")) {
        assert.equal(version, "workspace:*");
      } else {
        assert.match(version, /^\d+\.\d+\.\d+$/);
      }
    }
  }
});
```

- [ ] **Step 4: Run the policy test and verify the expected failure**

Run: `node --test tests/repository/version-policy.test.ts`

Expected: FAIL because the root manifest does not exist yet; this bootstrap policy test deliberately uses Node's built-in runner so it can fail before dependencies are installed.

- [ ] **Step 5: Create the workspace manifests with the audited exact versions**

Use this audited root manifest; if Step 2 returns newer stable releases on implementation day, update this complete version set first. Never use `^`, `~`, `latest`, `next`, or a prerelease tag:

```json
{
  "name": "personal-lab",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.21.0",
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "pnpm run test:repository && turbo test",
    "test:repository": "node --test tests/repository/version-policy.test.ts tests/repository/text-policy.test.ts",
    "test:unit": "pnpm run test:repository && turbo test",
    "test:e2e": "playwright test",
    "typecheck": "turbo typecheck && tsc --noEmit -p tsconfig.json",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "validate:versions": "node scripts/verify-versions.ts",
    "validate:text": "node scripts/verify-text-format.ts",
    "validate": "pnpm validate:versions && pnpm validate:text && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.12.1",
    "@kunlun/eslint-config": "workspace:*",
    "@nuxt/test-utils": "4.1.0",
    "@playwright/test": "1.62.1",
    "@types/node": "24.13.3",
    "@vue/test-utils": "2.4.11",
    "axe-core": "4.13.0",
    "eslint": "9.39.5",
    "eslint-import-resolver-typescript": "4.4.5",
    "eslint-plugin-vue": "10.10.0",
    "happy-dom": "20.11.2",
    "jiti": "2.7.0",
    "prettier": "3.9.6",
    "turbo": "2.10.9",
    "typescript": "6.0.3",
    "vitest": "4.1.10",
    "vue-eslint-parser": "10.4.1",
    "vue-tsc": "3.3.9"
  }
}
```

Set both `.nvmrc` and `.node-version` to `24.19.0`. `apps/web/package.json` pins `nuxt: 4.5.2`, `@nuxt/content: 3.15.2`, `vue: 3.5.41`, and `zod: 4.4.3`; internal packages use `workspace:*`. Root `package.json` consumes `@kunlun/eslint-config` through `workspace:*`, and `eslint.config.ts` imports the approved base config by package name. `scripts/verify-versions.ts` must reject external prerelease tags, external ranges, mismatched `.nvmrc` / `.node-version` / `engines.node`, and an unpinned `packageManager`, while explicitly allowing `workspace:*` for internal packages. Root `tsconfig.json` extends `tsconfig.base.json` and includes authored config, scripts, and repository tests; every package has a focused `tsconfig.json`; Nuxt uses `nuxt typecheck`, while Vue packages use `vue-tsc --noEmit` and pure TypeScript packages use `tsc --noEmit`. `turbo.json` must cache `.nuxt/**`, `.output/**`, coverage, and test outputs without caching `dev`.

- [ ] **Step 6: Install once and run the repository policy test**

Run:

```powershell
corepack.cmd enable
corepack.cmd prepare pnpm@11.21.0 --activate
pnpm.cmd install --frozen-lockfile=false
pnpm.cmd validate:versions
node --test tests/repository/version-policy.test.ts
```

Expected: both commands PASS and `pnpm-lock.yaml` is generated.

- [ ] **Step 7: Write the failing text-policy tests**

Create `tests/repository/text-policy.test.ts` against a pure `inspectTextFile` helper. Cover accepted UTF-8 TypeScript with LF and a final newline, then rejection of UTF-8 BOM, CRLF or bare CR, a missing final LF, and authored JavaScript extensions. Add a control proving generated Nitro output is ignored. TypeScript strictness is enforced by `tsc --noEmit` itself instead of duplicating compiler-option assertions in a text test.

- [ ] **Step 8: Run the conventions test and verify the expected failure**

Run: `node --test tests/repository/text-policy.test.ts`

Expected: FAIL because `scripts/lib/text-policy.ts` does not exist yet.

- [ ] **Step 9: Create the approved TypeScript, EditorConfig, Git, Prettier, and ESLint configs**

Create the files exactly from Approved Code Conventions. Root `package.json` must consume `@kunlun/eslint-config` through `workspace:*`, and `eslint.config.ts` must import its approved base config by package name. `eslint.config.ts` must ignore `.nuxt`, `.output`, `coverage`, `dist`, `node_modules`, Playwright reports, generated type declarations, minified assets, and Docker-prune output. It must lint authored `.ts`, `.tsx`, and `.vue` files only, configure `vue-eslint-parser` with `typescript-eslint` as the script parser, and keep the user-approved base rules as the final style override.

`scripts/verify-text-format.ts` must enumerate tracked and not-ignored untracked text files with `git ls-files --cached --others --exclude-standard -z`, reject UTF-8 BOM, CRLF or bare CR bytes, missing final LF, and authored `.js` / `.jsx` / `.mjs` / `.cjs` files. It skips binary paths declared in `.gitattributes` and generated directories. Generated runtime content below ignored build directories such as `.output` is outside the authored-source check.

- [ ] **Step 10: Run all convention gates**

Run:

```powershell
node --test tests/repository/text-policy.test.ts
pnpm.cmd validate:text
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
```

Expected: every command exits 0, ESLint reports zero warnings, TypeScript reports zero errors, and the text verifier reports zero BOM/CRLF/authored-JavaScript violations.

- [ ] **Step 11: Commit only shareable repository files**

```powershell
git status --short
git add -- . ":!AGENTS.override.md"
git diff --cached --name-only
git commit -m "chore: bootstrap personal lab workspace"
```

Expected: the staged-file list does not contain `AGENTS.override.md`.

---

### Task 2: Shared Content and Link Decision Contracts

**Files:**
- Create: `packages/shared/src/content.ts`
- Create: `packages/shared/src/links.ts`
- Create: `packages/shared/src/result.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/links.test.ts`

**Interfaces:**
- Produces: `WorkMeta`, `WorkType`, `PublishStatus`, `Result<T, E>`.
- Produces: `resolvePrimaryWorkAction(work: WorkMeta): WorkAction | null` and `resolveSecondaryWorkActions(work: WorkMeta): WorkAction[]`.

- [ ] **Step 1: Write failing link-policy tests**

```ts
test.each([
  [
    { status: "maintained", appUrl: "https://www.kunlunmarket.work/" },
    "https://www.kunlunmarket.work/",
  ],
  [{ status: "alpha", toolId: "jd-skill-radar" }, "/tools/jd-skill-radar"],
  [{ status: "draft" }, null],
])("selects the permitted primary action", (partial, expected) => {
  const work = makeWork(partial);

  expect(resolvePrimaryWorkAction(work)?.href ?? null).toBe(expected);
});

test("keeps source and case study as secondary actions", () => {
  const work = makeWork({
    appUrl: "https://app.example",
    caseStudyUrl: "/works/example",
    sourceUrl: "https://github.com/example/repo",
  });

  expect(resolveSecondaryWorkActions(work).map((action) => action.kind)).toEqual([
    "case-study",
    "source",
  ]);
});
```

- [ ] **Step 2: Run the focused tests**

Run: `pnpm --filter @kunlun/shared test -- links.test.ts`

Expected: FAIL because the contracts and resolvers do not exist.

- [ ] **Step 3: Implement discriminated types and deterministic action rules**

```ts
export interface WorkAction {
  kind: "launch" | "open-tool" | "case-study" | "source";
  label: string;
  href: string;
  external: boolean;
}

export function resolvePrimaryWorkAction(work: WorkMeta): WorkAction | null {
  if (work.status === "draft") {
    return null;
  }

  if (work.toolId) {
    return {
      kind: "open-tool",
      label: "打开工具",
      href: `/tools/${work.toolId}`,
      external: false,
    };
  }

  if (work.appUrl) {
    return { kind: "launch", label: "访问实际应用", href: work.appUrl, external: true };
  }

  return null;
}
```

Implement secondary actions in case-study-then-source order and never promote `sourceUrl` to the primary action.

- [ ] **Step 4: Run unit tests and type checking**

Run: `pnpm --filter @kunlun/shared test && pnpm --filter @kunlun/shared typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- packages/shared
git commit -m "feat(shared): define content and work action contracts"
```

---

### Task 3: B1 Design Tokens and Accessible UI Primitives

**Files:**
- Create: `packages/ui/src/styles/tokens.css`
- Create: `packages/ui/src/styles/base.css`
- Create: `packages/ui/src/components/LabButton.vue`
- Create: `packages/ui/src/components/StatusBadge.vue`
- Create: `packages/ui/src/components/LabPanel.vue`
- Create: `packages/ui/src/components/MetricCell.vue`
- Create: `packages/ui/src/index.ts`
- Test: `packages/ui/src/components/ui-primitives.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--lab-bg`, `--lab-surface`, `--lab-border`, `--lab-text`, `--lab-muted`, `--lab-accent`, `--lab-experiment`, `--lab-focus`.
- Produces: `LabButton`, `StatusBadge`, `LabPanel`, `MetricCell`.

- [ ] **Step 1: Write failing component accessibility tests**

```ts
test("renders status with visible text and button with native semantics", () => {
  const badge = mount(StatusBadge, { props: { tone: "online", label: "持续维护" } });
  expect(badge.text()).toContain("持续维护");
  expect(badge.attributes("data-tone")).toBe("online");

  const button = mount(LabButton, { slots: { default: "分析 JD" } });
  expect(button.get("button").attributes("type")).toBe("button");
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm --filter @kunlun/ui test -- ui-primitives.test.ts`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement tokens and primitives**

Use `#0d1117` as background, `#131922` as surface, `#2a3441` as border, `#e6edf3` as primary text, `#8bffb0` as primary accent, and `#ab9cff` as experiment accent. Define a 2px focus ring with offset, minimum 44px pointer targets for primary controls, and system sans / system mono font stacks without remote font dependency.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run unit tests, type checking, and a contrast spot check**

Run: `pnpm --filter @kunlun/ui test && pnpm --filter @kunlun/ui typecheck`

Expected: PASS. Verify primary text and accent-on-dark combinations meet WCAG AA using browser accessibility tooling during Task 13.

- [ ] **Step 5: Commit**

```powershell
git add -- packages/ui
git commit -m "feat(ui): add B1 tokens and accessible primitives"
```

---

### Task 4: Nuxt Application Shell, Four-Item Navigation, and SEO Baseline

**Files:**
- Create: `apps/web/nuxt.config.ts`
- Create: `apps/web/app.vue`
- Create: `apps/web/layouts/default.vue`
- Create: `apps/web/components/SiteHeader.vue`
- Create: `apps/web/components/SiteFooter.vue`
- Create: `apps/web/assets/css/main.css`
- Create: `apps/web/error.vue`
- Test: `apps/web/tests/components/site-header.test.ts`

**Interfaces:**
- Consumes: `@kunlun/ui/styles/tokens.css`, `@kunlun/ui/styles/base.css`.
- Produces: stable routes `/`, `/works`, `/articles`, `/about`; global error copy without stack disclosure.

- [ ] **Step 1: Write the failing navigation test**

```ts
test("exposes exactly the confirmed four navigation entries", () => {
  const wrapper = mount(SiteHeader, {
    global: { stubs: { NuxtLink: RouterLinkStub } },
  });
  const labels = wrapper.findAll("nav a").map((link) => link.text());

  expect(labels).toEqual(["首页", "作品", "文章", "关于"]);
  expect(wrapper.get("nav").attributes("aria-label")).toBe("主导航");
});
```

- [ ] **Step 2: Run and observe failure**

Run: `pnpm --filter @kunlun/web test -- site-header.test.ts`

Expected: FAIL because the web shell is absent.

- [ ] **Step 3: Implement Nuxt shell and page-wide CSS**

Configure `@nuxt/content`, global UI CSS, Chinese document language, color-scheme, viewport, default title template and description. Keep grid texture on shell/index/tool contexts via `.lab-grid`; use `.reading-surface` with a plain background and a `68ch` content measure for article detail.

```ts
export default defineNuxtConfig({
  modules: ["@nuxt/content"],
  css: [
    "@kunlun/ui/styles/tokens.css",
    "@kunlun/ui/styles/base.css",
    "~/assets/css/main.css",
  ],
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      meta: [{ name: "color-scheme", content: "dark" }],
    },
  },
  typescript: { strict: true, typeCheck: true },
});
```

- [ ] **Step 4: Run shell tests and production compilation**

Run: `pnpm --filter @kunlun/web test && pnpm --filter @kunlun/web typecheck && pnpm --filter @kunlun/web build`

Expected: PASS; the build produces `apps/web/.output`.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/web
git commit -m "feat(web): establish Nuxt application shell"
```

---

### Task 5: Nuxt Content Schemas and Initial Honest Content

**Files:**
- Create: `apps/web/content.config.ts`
- Create: `apps/web/content/works/interview-notes.md`
- Create: `apps/web/content/works/jd-skill-radar.md`
- Create: `apps/web/content/articles/building-a-personal-lab.md`
- Create: `apps/web/content/pages/about.md`
- Create: `scripts/validate-content.ts`
- Test: `apps/web/tests/content/content-schema.test.ts`

**Interfaces:**
- Produces: collections `articles`, `works`, `pages` using non-overlapping source globs.
- Produces: typed frontmatter matching `WorkMeta`; article fields `publishedAt`, `updatedAt`, `tags`, `featured`, `draft`.

- [ ] **Step 1: Write failing schema fixtures**

```ts
test("rejects a published external work without an appUrl", () => {
  expect(() => workSchema.parse({
    title: "Broken",
    description: "Broken work",
    type: "project",
    status: "maintained",
    publishedAt: "2026-08-10",
    updatedAt: "2026-08-10",
    featured: true,
  })).toThrow();
});

test("accepts the external knowledge base with appUrl as primary destination", () => {
  expect(workSchema.parse(interviewNotesFrontmatter).appUrl).toBe(
    "https://www.kunlunmarket.work/",
  );
});
```

- [ ] **Step 2: Run the content tests**

Run: `pnpm --filter @kunlun/web test -- content-schema.test.ts`

Expected: FAIL because `content.config.ts` and schemas are absent.

- [ ] **Step 3: Define the three collections with Zod refinements**

Use `defineContentConfig`, `defineCollection`, and `z` from `@nuxt/content`. Source patterns must be `articles/**/*.md`, `works/**/*.md`, and `pages/**/*.md`. Refine works so a non-draft entry has exactly one launch strategy: `toolId` for an internal tool or `appUrl` for an external work; allow optional `sourceUrl` and `caseStudyUrl`.

- [ ] **Step 4: Add minimal truthful seed content**

`interview-notes.md` must describe the independent VitePress knowledge base and set `appUrl: https://www.kunlunmarket.work/`. `jd-skill-radar.md` must use `toolId: jd-skill-radar` and make no AI claims. The first article must be clearly a build record, not invented user feedback. About content must use only facts supplied by the owner; where personal details are unavailable, omit the field instead of inventing copy.

- [ ] **Step 5: Validate content and build**

Run: `pnpm --filter @kunlun/web test -- content-schema.test.ts && node scripts/validate-content.ts && pnpm --filter @kunlun/web build`

Expected: PASS; malformed test fixtures fail validation while checked-in content builds.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/web/content.config.ts apps/web/content scripts/validate-content.ts apps/web/tests/content
git commit -m "feat(content): define collections and initial entries"
```

---

### Task 6: Tool Contract, Registry Validation, and Isolated ToolShell

**Files:**
- Modify: `packages/shared/src/content.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/tool-kit/src/contract.ts`
- Create: `packages/tool-kit/src/registry.ts`
- Create: `packages/tool-kit/src/components/ToolShell.vue`
- Create: `packages/tool-kit/src/index.ts`
- Create: `packages/tools/jd-skill-radar/src/components/JdSkillRadarDraft.vue`
- Create: `packages/tools/jd-skill-radar/src/manifest.ts`
- Create: `packages/tools/jd-skill-radar/src/index.ts`
- Create: `scripts/validate-tools.ts`
- Test: `packages/tool-kit/src/registry.test.ts`
- Test: `packages/tool-kit/src/components/ToolShell.test.ts`
- Test: `scripts/validate-tools.test.ts`

**Interfaces:**
- Produces: `ToolManifest` from Shared Domain Contracts.
- Produces: `createToolRegistry(manifests: readonly ToolManifest[]): ReadonlyMap<string, ToolManifest>`.
- Produces: `validateWorkToolLinks(works, registry): void`.
- Produces: `ToolShell` slots `default`, `loading`, `error`, `feedback` and retry event `retry`.
- Produces: the authoritative `jdSkillRadarManifest` as a truthful draft manifest until Task 10.

- [ ] **Step 1: Write failing registry and boundary tests**

```ts
test("rejects duplicate manifest IDs", () => {
  expect(() => createToolRegistry([manifest("radar"), manifest("radar")])).toThrow(
    "Duplicate tool id: radar",
  );
});

test("rejects a work that references a missing tool", () => {
  expect(() =>
    validateWorkToolLinks([{ toolId: "missing", title: "Missing" }], new Map()),
  ).toThrow("Unknown toolId \"missing\"");
});

test("shows safe error copy and retry without a stack", async () => {
  const wrapper = mount(ToolShell, {
    props: { state: "error", error: new Error("internal stack marker") },
  });

  expect(wrapper.text()).toContain("工具暂时无法运行");
  expect(wrapper.text()).not.toContain("internal stack marker");
  await wrapper.get("[data-test=\"retry\"]").trigger("click");
  expect(wrapper.emitted("retry")).toHaveLength(1);
});
```

- [ ] **Step 2: Run focused tests**

Run: `pnpm --filter @kunlun/tool-kit test`

Expected: FAIL because the package has no implementation.

- [ ] **Step 3: Implement manifest validation and ToolShell states**

Move the stable `ToolManifest` interface from the Shared Domain Contracts section into
`@kunlun/shared`. The registry must reject empty or malformed IDs, duplicate IDs, non-client
runtimes, archived statuses, unsupported or duplicate capabilities, and invalid loaders.
`ToolShell` must preserve the surrounding page and navigation while replacing only the tool
viewport with ready/loading/error/feedback content. It must never render an exception message or
stack.

Create `jdSkillRadarManifest` now with the stable ID and title, `runtime: "client"`,
`status: "draft"`, no capabilities, and an async draft placeholder component. The placeholder
must state that the tool is still under construction and must not claim analysis is available.
This is the single authoritative manifest that Task 10 will upgrade in place.

- [ ] **Step 4: Connect validation to the root build gate**

Set root `prebuild` to `node scripts/validate-content.ts && node scripts/validate-tools.ts`. The tool
validator must import an explicit manifest list containing `jdSkillRadarManifest`, read the
checked-in work metadata, and fail with the work title plus invalid `toolId`. Do not use filesystem
manifest discovery or a separate tool-ID catalog.

- [ ] **Step 5: Run tests and deliberate failure probes**

Run: `pnpm --filter @kunlun/tool-kit test && pnpm validate && node scripts/validate-tools.ts`

Expected: PASS. Temporarily duplicating a manifest ID or changing checked-in `toolId` to `missing` must make the validator fail; revert only that probe before committing.

- [ ] **Step 6: Commit**

```powershell
git add -- packages/shared packages/tool-kit packages/tools/jd-skill-radar scripts/validate-tools.ts scripts/validate-tools.test.ts package.json
git commit -m "feat(tool-kit): 校验并隔离内部工具"
```

---

### Task 7: JD Skill Dictionary, Alias Matching, and Requirement Tone

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/types.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/skill-dictionary.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/normalize.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/match-skills.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/detect-tone.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/note-links.ts`
- Test: `packages/tools/jd-skill-radar/src/domain/match-skills.test.ts`
- Test: `packages/tools/jd-skill-radar/src/domain/detect-tone.test.ts`

**Interfaces:**
- Produces: `SKILLS: readonly SkillDefinition[]` with stable IDs, aliases, category, checklist label and optional verified note URL.
- Produces: `matchSkills(text: string): RawSkillMatch[]`.
- Produces: `detectTone(context: string): RequirementTone`.

- [ ] **Step 1: Write failing boundary-aware matching tests**

```ts
test.each([
  ["熟悉 Vue 3、TypeScript 和 Vite", ["typescript", "vite", "vue"]],
  ["具备 Node.js 服务开发经验", ["nodejs"]],
  ["维护 React Native 应用", ["react-native"]],
])("normalizes aliases without double counting", (text, ids) => {
  expect(matchSkills(text).map((item) => item.skillId).sort()).toEqual(ids);
});

test("does not match git inside digital or react inside reactive", () => {
  expect(matchSkills("digital reactive design")).toEqual([]);
});
```

- [ ] **Step 2: Write failing tone precedence tests**

```ts
test.each([
  ["必须熟练掌握 TypeScript", "required"],
  ["熟悉 Vue 生态", "familiar"],
  ["有 Node.js 经验优先，作为加分项", "preferred"],
  ["使用 Git 协作", "neutral"],
])("detects requirement tone", (context, tone) => {
  expect(detectTone(context)).toBe(tone);
});
```

- [ ] **Step 3: Run focused domain tests**

Run: `pnpm --filter @kunlun/jd-skill-radar test -- match-skills.test.ts detect-tone.test.ts`

Expected: FAIL because dictionary and matchers are absent.

- [ ] **Step 4: Implement a deliberately finite v1 dictionary**

Cover the confirmed categories and common front-end terms: JavaScript, TypeScript, HTML, CSS, Sass, Tailwind CSS, Vue, Vue Router, Pinia, React, Next.js, Angular, Vite, Webpack, Rollup, testing, componentization, performance, Node.js, Express, Electron, React Native, UniApp, Docker, CI/CD, Git, code review, agile collaboration. Use escaped, boundary-aware regular expressions and sort aliases longest-first.

- [ ] **Step 5: Implement context extraction and tone precedence**

Extract at most 80 characters around each match, merge aliases into the canonical skill ID, keep distinct contexts, and use precedence `required > preferred > familiar > neutral` when the same skill appears with multiple tones.

- [ ] **Step 6: Add only verified knowledge-base deep links**

Open `https://www.kunlunmarket.work/` and verify each candidate chapter URL returns the expected page before adding it to `note-links.ts`. If a stable matching chapter cannot be verified, omit `noteUrl`; never guess routes from local Markdown paths.

- [ ] **Step 7: Run tests and commit**

Run: `pnpm --filter @kunlun/jd-skill-radar test && pnpm --filter @kunlun/jd-skill-radar typecheck`

```powershell
git add -- packages/tools/jd-skill-radar/src/domain
git commit -m "feat(jd-radar): match skills and requirement tone"
```

---

### Task 8: JD Overview Extraction, Category Scoring, and Analysis Pipeline

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/validate-input.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/extract-overview.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/score-categories.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/build-checklist.ts`
- Create: `packages/tools/jd-skill-radar/src/domain/analyze-jd.ts`
- Test: `packages/tools/jd-skill-radar/src/domain/analyze-jd.test.ts`
- Test: `packages/tools/jd-skill-radar/src/domain/fixtures/frontend-vue.ts`

**Interfaces:**
- Consumes: `matchSkills`, `detectTone`, `SKILLS`.
- Produces: `analyzeJd(text: string): AnalyzeJdResult`.
- Produces: `MIN_JD_LENGTH = 80`, `MAX_JD_LENGTH = 20_000`.

- [ ] **Step 1: Write failing input-state tests**

```ts
test.each([
  ["", "EMPTY"],
  ["Vue", "TOO_SHORT"],
  ["x".repeat(20_001), "TOO_LONG"],
  ["负责客户沟通、合同归档与行政支持。".repeat(8), "NO_SKILLS"],
])("returns explicit non-throwing input errors", (text, code) => {
  expect(analyzeJd(text)).toMatchObject({ ok: false, error: { code } });
});
```

- [ ] **Step 2: Write failing successful-analysis assertions**

```ts
test("extracts only evidenced overview fields and normalized scores", () => {
  const result = analyzeJd(vueFrontendFixture);
  expect(result.ok).toBe(true);

  if (!result.ok) {
    return;
  }

  expect(result.value.overview).toMatchObject({ experience: "3–5 年", education: "本科" });
  expect(result.value.overview.primaryFrameworks).toContain("Vue");
  expect(result.value.categories.every((item) => item.score >= 0 && item.score <= 100)).toBe(
    true,
  );
  expect(result.value.keywords.find((item) => item.skillId === "typescript")?.tone).toBe(
    "required",
  );
});

test("uses 未识别 rather than inference when evidence is absent", () => {
  const result = analyzeJd(validFixtureWithoutLocation);

  expect(result.ok && result.value.overview.location).toBe("未识别");
});
```

- [ ] **Step 3: Run analysis tests**

Run: `pnpm --filter @kunlun/jd-skill-radar test -- analyze-jd.test.ts`

Expected: FAIL because the pipeline is absent.

- [ ] **Step 4: Implement deterministic extraction and weighting**

Extract role from explicit title-like lines, experience from patterns such as `3-5 年`, education from explicit degree words, and location/work mode only from explicit city, remote, hybrid, or on-site phrases. Score each match with tone weights `{ required: 4, preferred: 3, familiar: 2, neutral: 1 }`, sum by category, then normalize the maximum present category to 100 and round all other present categories proportionally; absent categories remain omitted.

- [ ] **Step 5: Build a deduplicated preparation checklist**

Create one checklist item per canonical skill, order by tone weight then occurrence count then label, and use stable ID `prepare:<skillId>`. Include `noteUrl` only when the dictionary has a verified link.

- [ ] **Step 6: Run unit tests, mutation probes, and type checking**

Run: `pnpm --filter @kunlun/jd-skill-radar test && pnpm --filter @kunlun/jd-skill-radar typecheck`

Expected: PASS. A fixture without education/location must return “未识别”, never a guessed value.

- [ ] **Step 7: Commit**

```powershell
git add -- packages/tools/jd-skill-radar/src/domain
git commit -m "feat(jd-radar): analyze JD overview and emphasis"
```

---

### Task 9: Markdown Export and Workbench State Machine

**Files:**
- Create: `packages/tools/jd-skill-radar/src/domain/to-markdown.ts`
- Create: `packages/tools/jd-skill-radar/src/browser/download-markdown.ts`
- Create: `packages/tools/jd-skill-radar/src/state/useJdRadar.ts`
- Test: `packages/tools/jd-skill-radar/src/domain/to-markdown.test.ts`
- Test: `packages/tools/jd-skill-radar/src/state/useJdRadar.test.ts`

**Interfaces:**
- Produces: `toMarkdown(analysis: JdAnalysis, checkedIds: ReadonlySet<string>): string`.
- Produces: `downloadMarkdown(markdown: string, filename: string): void`.
- Produces: `useJdRadar()` with state `idle | analyzing | ready | stale | invalid | failed` and actions `setInput`, `analyze`, `toggleChecklist`, `copyMarkdown`, `downloadMarkdown`, `reset`, `retry`.

- [ ] **Step 1: Write failing state transition tests**

```ts
test("keeps prior result and marks it stale after input changes", async () => {
  const radar = useJdRadar({ analyze: () => successResult });
  radar.setInput(validJd);
  await radar.analyze();
  radar.setInput(`${validJd}\n新增要求：熟悉 Docker`);

  expect(radar.status.value).toBe("stale");
  expect(radar.analysis.value).toEqual(successResult.value);
});

test("reset removes input, result, checked state, and feedback", async () => {
  const radar = useReadyRadar();
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

- [ ] **Step 2: Write failing Markdown tests**

Assert headings for岗位概览、技能分布、关键词明细、准备清单; checked items render `- [x]`; unknown fields render “未识别”; output includes the scoring disclaimer and contains no original JD body.

- [ ] **Step 3: Run focused tests**

Run: `pnpm --filter @kunlun/jd-skill-radar test -- useJdRadar.test.ts to-markdown.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement pure serialization and browser adapters**

Keep `toMarkdown` free of browser globals. Put Clipboard API and Blob/Object URL code in adapters; revoke download URLs after click. Surface success/failure as short status text in an `aria-live="polite"` region.

- [ ] **Step 5: Implement explicit state transitions**

`analyze` validates synchronously, retains old output only for `stale`, converts unexpected exceptions into `failed`, and lets `retry` re-run the latest input. Do not use localStorage, IndexedDB, cookies, analytics, or network calls.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm --filter @kunlun/jd-skill-radar test && pnpm --filter @kunlun/jd-skill-radar typecheck`

```powershell
git add -- packages/tools/jd-skill-radar/src/domain packages/tools/jd-skill-radar/src/browser packages/tools/jd-skill-radar/src/state
git commit -m "feat(jd-radar): add local export and workspace state"
```

---

### Task 10: JD Radar Vue Workbench and Manifest

**Files:**
- Create: `packages/tools/jd-skill-radar/src/components/JdInputPanel.vue`
- Create: `packages/tools/jd-skill-radar/src/components/JdOverview.vue`
- Create: `packages/tools/jd-skill-radar/src/components/SkillDistribution.vue`
- Create: `packages/tools/jd-skill-radar/src/components/KeywordDetails.vue`
- Create: `packages/tools/jd-skill-radar/src/components/PreparationChecklist.vue`
- Create: `packages/tools/jd-skill-radar/src/components/JdSkillRadar.vue`
- Create: `packages/tools/jd-skill-radar/src/styles.css`
- Modify: `packages/tools/jd-skill-radar/src/manifest.ts`
- Modify: `packages/tools/jd-skill-radar/src/index.ts`
- Test: `packages/tools/jd-skill-radar/src/components/JdSkillRadar.test.ts`

**Interfaces:**
- Consumes: `useJdRadar`, UI primitives, `ToolManifest`, and the draft manifest identity from Task 6.
- Produces: default async component `JdSkillRadar`; upgrades the existing manifest ID
  `jd-skill-radar` to status `alpha` with capabilities `clipboard`, `download`.

- [ ] **Step 1: Write failing user-state component tests**

Cover these visible states with exact assertions: idle has one centered input panel; ready has input left/results right; editing ready input leaves results visible and announces “输入已修改，当前结果已过期”; invalid shows the matching error beside the input; no-skills explains that no known front-end skill signals were found; reset returns to idle.

- [ ] **Step 2: Write failing interaction tests**

Use keyboard events to submit with the focused analyze button, toggle a native checkbox, copy Markdown, download Markdown, and retry a forced analyzer exception. Assert privacy copy says “文本仅在当前浏览器中分析，不会上传服务器”.

- [ ] **Step 3: Run component tests**

Run: `pnpm --filter @kunlun/jd-skill-radar test -- JdSkillRadar.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the B1 responsive workbench**

At desktop widths use `grid-template-columns: minmax(18rem,.85fr) minmax(0,1.45fr)`; under 900px stack input over results. Idle state constrains the input to a readable centered width. Use real `<button>`, `<textarea>`, `<input type="checkbox">`, `<meter>` or accessible progress semantics, visible textual scores and tones, and a persistent scoring disclaimer.

- [ ] **Step 5: Upgrade the draft manifest in place**

```ts
export const jdSkillRadarManifest: ToolManifest = {
  id: "jd-skill-radar",
  title: "前端岗位 JD 技能雷达",
  runtime: "client",
  status: "alpha",
  capabilities: ["clipboard", "download"],
  component: () => import("./components/JdSkillRadar.vue"),
};
```

Replace the Task 6 placeholder loader rather than adding a second manifest or tool-ID catalog.

- [ ] **Step 6: Run package verification and commit**

Run: `pnpm --filter @kunlun/jd-skill-radar test && pnpm --filter @kunlun/jd-skill-radar typecheck`

```powershell
git add -- packages/tools/jd-skill-radar
git commit -m "feat(jd-radar): build responsive local workbench"
```

---

### Task 11: Tool Registration and Tool Detail Route

**Files:**
- Create: `apps/web/plugins/tool-registry.ts`
- Create: `apps/web/composables/useToolRegistry.ts`
- Create: `apps/web/components/InternalToolRenderer.vue`
- Create: `apps/web/pages/tools/[toolId].vue`
- Create: `apps/web/middleware/tool-id.global.ts`
- Test: `apps/web/tests/integration/tool-route.test.ts`

**Interfaces:**
- Consumes: `jdSkillRadarManifest`, `createToolRegistry`, `ToolShell`.
- Produces: Nuxt injection `$toolRegistry`; route `/tools/jd-skill-radar`.

- [ ] **Step 1: Write failing integration tests**

```ts
test("loads the registered tool asynchronously inside ToolShell", async () => {
  await page.goto("/tools/jd-skill-radar");
  await expect(page.getByRole("heading", { name: "前端岗位 JD 技能雷达" })).toBeVisible();
  await expect(page.getByText("LOCAL MODE")).toBeVisible();
});

test("returns a safe 404 for an unknown tool id", async () => {
  const response = await page.goto("/tools/not-registered");

  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: Run the route test**

Run: `pnpm test:e2e --grep "registered tool|unknown tool"`

Expected: FAIL because the route and registry plugin do not exist.

- [ ] **Step 3: Register only explicit manifests and render through the boundary**

Create the registry from `[jdSkillRadarManifest]`; do not use filesystem magic imports that hide duplicates. The page resolves content by matching `toolId`, resolves the manifest, renders work introduction above or beside `ToolShell`, and places long privacy/scoring/method explanation below the workbench.

- [ ] **Step 4: Validate isolation**

Force the async component loader to reject in a component test. Expected: header, navigation, work title and explanatory content remain visible; only the tool viewport shows safe error and retry controls.

- [ ] **Step 5: Run route, registry and build verification**

Run: `pnpm test:e2e --grep "registered tool|unknown tool" && pnpm --filter @kunlun/web test && pnpm build`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/web/plugins apps/web/composables apps/web/components/InternalToolRenderer.vue apps/web/pages/tools apps/web/middleware
git commit -m "feat(web): register and render internal tools"
```

---

### Task 12: Home, Works, Articles, and About Experiences

**Files:**
- Create: `apps/web/components/home/HomeHero.vue`
- Create: `apps/web/components/home/SystemOverview.vue`
- Create: `apps/web/components/home/CurrentBuild.vue`
- Create: `apps/web/components/WorkCard.vue`
- Create: `apps/web/components/ArticleRow.vue`
- Create: `apps/web/components/TagFilter.vue`
- Create: `apps/web/pages/index.vue`
- Create: `apps/web/pages/works/index.vue`
- Create: `apps/web/pages/works/[...slug].vue`
- Create: `apps/web/pages/articles/index.vue`
- Create: `apps/web/pages/articles/[...slug].vue`
- Create: `apps/web/pages/about.vue`
- Test: `apps/web/tests/pages/content-pages.test.ts`

**Interfaces:**
- Consumes: typed collections and shared link resolvers.
- Produces: real counts from collections; featured works; recent articles; tag-only article filtering.

- [ ] **Step 1: Write failing page-data tests**

Assert the homepage counts actual published work/article entries rather than hardcoded numbers; featured works are filtered by `featured`; recent articles are ordered by `publishedAt DESC`; draft entries are absent. Assert the works index exposes type and status labels, and article filters derive unique tags without creating category routes.

- [ ] **Step 2: Write failing action-policy rendering tests**

Assert `interview-notes` primary button href equals `https://www.kunlunmarket.work/`; internal radar primary action equals `/tools/jd-skill-radar`; source appears only when `sourceUrl` exists; a draft card has no experience button.

- [ ] **Step 3: Run page tests**

Run: `pnpm --filter @kunlun/web test -- content-pages.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement B1 homepage sections**

Follow the confirmed sketch order: restrained personal introduction and availability status; current build; real collection metrics; featured works; recent build logs/articles; concise cooperation invitation linked to About. Do not use “ENTER LAB” as a separate destination and do not invent metrics, testimonials, users, revenue, or feedback.

- [ ] **Step 5: Implement content indexes and detail pages**

Query collections with `queryCollection`. Works index combines project/tool/experiment cards with visible type and status text. Articles use only tags. Article detail applies `.reading-surface`, removes the dashboard grid behind prose, constrains measure, and renders semantic headings and links through `ContentRenderer`.

- [ ] **Step 6: Implement About from supplied content only**

Render short experience, technical direction, social links, contact and accepted cooperation types only when present in content. Omit unavailable fields rather than inventing biography or filler copy.

- [ ] **Step 7: Run tests and build**

Run: `pnpm --filter @kunlun/web test && pnpm --filter @kunlun/web typecheck && pnpm --filter @kunlun/web build`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- apps/web/components apps/web/pages apps/web/tests/pages apps/web/assets/css/main.css
git commit -m "feat(web): add personal lab content experiences"
```

---

### Task 13: Critical E2E, Accessibility, Responsive, and Visual Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/navigation.spec.ts`
- Create: `tests/e2e/work-links.spec.ts`
- Create: `tests/e2e/jd-radar.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/visual.spec.ts`
- Create: `tests/e2e/fixtures/vue-jd.ts`
- Create: `tests/e2e/support/axe.ts`

**Interfaces:**
- Produces: deterministic desktop `1440x1000` and mobile `390x844` projects.
- Produces: screenshot baselines for homepage, article detail, JD idle, JD ready, and JD stale.

- [ ] **Step 1: Write failing critical-flow E2E tests**

Cover four-item navigation, actual knowledge-base primary link, internal-tool launch, valid analysis, stale result after editing, checklist toggle, copy, download event, reset, empty/short/long/no-match errors, and unknown tool 404.

- [ ] **Step 2: Write failing accessibility tests**

Run axe on `/`, `/works`, `/articles`, one article detail and `/tools/jd-skill-radar` in idle and ready states. Add keyboard-only assertions for skip link, navigation, analyze, export, checklist and reset. Assert stale, error and success feedback is conveyed by text and an appropriate live region.

- [ ] **Step 3: Run E2E and confirm failures identify missing coverage/configuration**

Run: `pnpm exec playwright install chromium && pnpm test:e2e`

Expected: FAIL until server orchestration, locators and final accessibility fixes are present.

- [ ] **Step 4: Configure deterministic webServer and projects**

Use `pnpm --filter @kunlun/web dev --host 127.0.0.1` for local E2E, reuse the server outside CI, forbid `test.only`, and retain trace/screenshot only on failure. Disable animations through reduced-motion emulation for screenshots.

- [ ] **Step 5: Capture and inspect visual baselines**

Compare against the three read-only references:

- `E:\interview-notes\.superpowers\brainstorm\visual-1786335475\content\homepage-directions.html`
- `E:\interview-notes\.superpowers\brainstorm\visual-1786335475\content\lab-home-layouts.html`
- `E:\interview-notes\.superpowers\brainstorm\visual-1786335475\content\jd-skill-radar-layout.html`

Verify B1 hierarchy, graphite/grid density, green primary/purple secondary usage, readable Chinese copy, article simplification, idle/ready/stale workbench layouts, 900px collapse and 390px overflow. Do not modify the reference files.

- [ ] **Step 6: Run complete browser verification**

Run: `pnpm test:e2e`

Expected: all functional, accessibility, responsive and visual tests PASS in Chromium at both viewports.

- [ ] **Step 7: Commit**

```powershell
git add -- playwright.config.ts tests/e2e apps/web packages
git commit -m "test: cover critical journeys and visual states"
```

---

### Task 14: Health Endpoint and Production Docker Deployment

**Files:**
- Create: `apps/web/server/api/health.get.ts`
- Create: `apps/web/server/tsconfig.json`
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `.dockerignore`
- Create: `.env.example`
- Test: `apps/web/tests/server/health.test.ts`
- Test: `tests/docker/smoke.ps1`

**Interfaces:**
- Produces: `GET /api/health -> 200 { status: "ok" }`.
- Produces: `docker compose up -d --build` and health-checked service `web` on configurable host port.

- [ ] **Step 1: Write the failing health handler test**

```ts
test("returns a minimal non-secret health response", async () => {
  expect(await healthHandler(mockEvent())).toEqual({ status: "ok" });
});
```

- [ ] **Step 2: Run the health test**

Run: `pnpm --filter @kunlun/web test -- health.test.ts`

Expected: FAIL because the handler is absent.

- [ ] **Step 3: Implement the endpoint and runtime contract**

Return only service status; do not include environment variables, versions, stack traces or host details. Configure Nitro to listen on `0.0.0.0` and take `PORT` from runtime environment.

- [ ] **Step 4: Implement the multi-stage Dockerfile**

Use the audited `node:24.19.0-bookworm-slim` tag; if Task 1 verifies a newer LTS patch, update this tag, `.node-version`, `.nvmrc`, and CI in the same change. Stages: `base` enables the exact Corepack/pnpm version; `pruner` runs `turbo prune @kunlun/web --docker`; `installer` installs the pruned lockfile with `--frozen-lockfile`; `builder` builds `@kunlun/web`; `runner` copies only `apps/web/.output` and necessary runtime files, creates an unprivileged user, sets `USER`, and runs the generated Nitro entry `node server/index.mjs`.

- [ ] **Step 5: Implement Compose and smoke test**

`compose.yaml` must build locally, expose `${LAB_PORT:-3000}:3000`, inject `NODE_ENV=production`, use `/api/health` for healthcheck, and restart `unless-stopped`. `tests/docker/smoke.ps1` must build, start, wait for healthy, assert the JSON response, request `/`, then print logs on failure. Cleanup must target only this compose project.

- [ ] **Step 6: Run production and container verification**

Run:

```powershell
pnpm --filter @kunlun/web test -- health.test.ts
pnpm build
docker compose up -d --build
Invoke-RestMethod http://localhost:3000/api/health
docker compose ps
docker compose down
```

Expected: health response is `{ status: "ok" }`; service becomes healthy; image process runs as the declared non-root user.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/server apps/web/tests/server Dockerfile compose.yaml .dockerignore .env.example tests/docker
git commit -m "feat(ops): add health check and Docker deployment"
```

---

### Task 15: CI, Dependency PR Policy, and Final Release Gate

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Create: `README.md`
- Modify: `package.json`
- Test: `tests/repository/ci-policy.test.ts`
- Test: all repository verification commands

**Interfaces:**
- Consumes: root `validate`, Playwright and Docker smoke scripts.
- Produces: CI jobs `quality`, `e2e`, `docker`; weekly dependency-update PRs without auto-merge.

- [ ] **Step 1: Write the failing CI policy test**

```ts
test("uses the repository Node major and never enables dependency auto-merge", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  const dependabot = await readFile(".github/dependabot.yml", "utf8");

  expect(workflow).toContain("node-version-file: .node-version");
  expect(workflow).toContain("pnpm install --frozen-lockfile");
  expect(`${workflow}\n${dependabot}`).not.toMatch(/auto-merge|automerge/i);
});
```

- [ ] **Step 2: Run and observe the missing-policy failure**

Run: `pnpm exec vitest run tests/repository/ci-policy.test.ts`

Expected: FAIL until workflow and dependency configuration exist.

- [ ] **Step 3: Implement CI with explicit gates**

`quality` runs frozen install, version validation, text-format validation, Prettier check, zero-warning ESLint, strict typecheck, unit tests and production build. `e2e` installs only Chromium and runs Playwright after `quality`. `docker` builds the production image and runs the health smoke test after `quality`. Use `.node-version` and exact pnpm from `packageManager`; do not use a floating Node major different from local/Docker.

- [ ] **Step 4: Configure dependency-update PRs without merge automation**

Configure weekly npm and GitHub Actions update groups with a low open-PR limit. Do not add auto-approve or auto-merge workflows, labels that trigger merging, or privileged pull-request execution.

- [ ] **Step 5: Document only supported operations**

README sections: positioning; prerequisites; exact Corepack bootstrap; `pnpm install --frozen-lockfile`; local dev; TypeScript/ESLint/EditorConfig/Prettier/LF conventions; content locations; internal-tool manifest contract; privacy statement; test commands; `docker compose up -d --build`; `/api/health`; runtime variables; explicit v1 non-goals. State that domain/TLS/reverse proxy/ICP remain server responsibilities.

- [ ] **Step 6: Run the full fresh-state release gate**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm validate:versions
pnpm validate:text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
docker compose up -d --build
Invoke-RestMethod http://localhost:3000/api/health
docker compose down
git status --short
```

Expected: every command succeeds; health is `ok`; `git status --short` shows no generated files that should be tracked and no accidental change under `E:\interview-notes`.

- [ ] **Step 7: Perform final requirements audit**

Confirm: exactly four nav items; honest collection-derived metrics; correct `interview-notes` primary URL; no copied knowledge-base Markdown; one internal tool; duplicate/missing tool IDs fail; all JD edge states; no persistence/network analysis; Markdown copy/download/reset; tool isolation; article reading mode; keyboard/focus/reduced-motion/non-color status; production build; non-root image; one-command Compose deployment; CI version alignment; no first-version exclusions accidentally implemented.

- [ ] **Step 8: Commit**

```powershell
git add -- .github README.md package.json tests/repository
git commit -m "ci: enforce personal lab release gates"
```

---

## Self-Review Record

- **Spec coverage:** Product positioning, four-route IA, independent `interview-notes`, content/action rules, B1 visual direction, accessibility, unified tool registry, JD analyzer outputs/states/privacy, failure isolation, Docker, version policy, TypeScript-only source, strict type-aware ESLint, no-`any`, EditorConfig/Git LF normalization, formatting, tests and explicit non-goals are each mapped to Tasks 1–15.
- **Deliberate omissions:** No login, payment, comments, admin, AI, resume input, multiple-JD comparison, runtime micro-frontends, content migration, domain/TLS/ICP/cloud selection or invented owner biography enters the implementation path.
- **Version scan:** Implementation behavior, signatures, routes, validation limits, scoring weights, commands and expected results are explicit. The plan records the 2026-08-10 stable version baseline and requires a coordinated official-channel refresh before implementation if releases change.
- **Type consistency:** `WorkMeta`, `ToolManifest`, `JdAnalysis`, `AnalyzeJdResult`, `RequirementTone` and `SkillCategory` use the same names and discriminants across content, registry, analyzer, state, Vue and export tasks.
- **Risk checkpoints:** Task 1 blocks prerelease/range drift, authored JavaScript, `any`, CRLF/BOM, formatting drift, ESLint warnings and type errors; Task 5 blocks dishonest content actions; Task 6 blocks registry mismatch; Tasks 7–9 keep analysis deterministic and local; Task 11 proves tool isolation; Task 13 verifies accessibility/visual state; Tasks 14–15 prove deployability and clean release state.

## Official References for the Implementer

- Node release status: `https://nodejs.org/en/about/previous-releases`
- Nuxt installation: `https://nuxt.com/docs/getting-started/installation`
- Nuxt Content collections: `https://content.nuxt.com/docs/collections/define`
- Nuxt Content querying: `https://content.nuxt.com/docs/utils/query-collection`
- Turborepo Docker pruning: `https://turborepo.com/docs/guides/tools/docker`
- pnpm installation/Corepack: `https://pnpm.io/installation`
- Vitest guide: `https://vitest.dev/guide/`
- Playwright testing: `https://playwright.dev/docs/intro`
