# Kunlun Lab

Kunlun Lab 是一个前端开发者的个人主页与产品实验室，用来分享技术实践，并开发对工作和生活有用的小工具。项目当前优先建立清晰的内容结构、统一的工具协议和浏览器本地运行的工具体验。

## 当前状态

| 状态   | 当前基线                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 已完成 | `pnpm` workspace 与 Turborepo monorepo；内容模型与基础校验；`@kunlun/ui` 基础 UI；`@kunlun/tool-kit` 工具协议与 registry 能力；`@kunlun/jd-skill-radar` 包内 alpha 实现。 |
| 进行中 | 当前基线没有登记可独立验收的主站接入事项；未完成事项不默认视为进行中，协作状态以[剩余工作清单](docs/remaining-work.md)为准。                                              |
| 未完成 | `apps/web` 仍是静态壳，尚无工具注册插件、`/tools/[toolId]` 路由、内容集合索引与详情渲染、Playwright 配置与 E2E、健康检查、Docker Compose、CI 或发布门禁。                 |

JD Skill Radar 的 package manifest 是 `alpha`，但对应作品内容仍是 `draft`。主站工具路由完成后，才处理发布元数据同步；本 README 不把它描述为已发布工具。

## 技术栈

- Node.js `24.x`，当前基线为 `24.19.0`
- `pnpm@11.21.0`、pnpm workspace、Turborepo
- TypeScript、Vue `3.5.41`、Nuxt `4.5.2`
- `@nuxt/content` 内容集合与 YAML frontmatter
- `zod` 内容与输入校验
- Vitest 单元测试；Playwright 与 Axe 依赖已列入项目，但 E2E 配置与门禁尚未完成

## 目录结构

```text
apps/web/                         Nuxt 主站，目前为静态壳
  content/articles/               文章内容
  content/pages/                  页面内容
  content/works/                  作品与工具介绍
  pages/                          当前主站页面壳
packages/shared/                  共享类型与基础结果模型
packages/ui/                      UI 组件与设计 token
packages/tool-kit/                工具 manifest、registry、ToolShell
packages/tools/jd-skill-radar/    前端岗位 JD 技能雷达 alpha package
packages/eslint-config/           共享 ESLint 配置
scripts/                          内容、工具、版本与文本策略校验
tests/repository/                 仓库级策略测试
docs/remaining-work.md            实时剩余工作清单
docs/superpowers/                 历史规格与计划，不作为实时 backlog
```

## 环境要求

在项目根目录使用以下版本：

```text
Node.js 24.x（当前基线：24.19.0）
pnpm 11.21.0
```

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务器启动后，按终端输出访问本地站点。当前站点可用于查看已有静态页面与基础内容壳；工具主站路由尚未接入。

## 常用命令

| 命令                   | 用途                                        | 当前边界                                                       |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`             | 通过 Turborepo 启动 workspace 开发任务      | 主站仍是静态壳                                                 |
| `pnpm build`           | 执行 workspace build                        | 会经过内容与工具注册校验；不等于发布完成                       |
| `pnpm test:repository` | 运行仓库级策略与校验测试                    | 不包含完整 E2E                                                 |
| `pnpm validate:text`   | 检查文本编码、换行和末尾 LF                 | 只覆盖文本策略                                                 |
| `pnpm format:check`    | 检查 Prettier 格式                          | 只检查格式，不执行修复                                         |
| `pnpm lint`            | 执行 ESLint                                 | 只覆盖静态检查                                                 |
| `pnpm typecheck`       | 执行 workspace 与根目录 TypeScript 类型检查 | 不提供浏览器流程验证                                           |
| `pnpm test`            | 运行仓库级测试与 workspace 测试             | 不等于完整发布门禁                                             |
| `pnpm test:e2e`        | 调用 Playwright                             | 当前尚无 Playwright 配置，暂不可作为质量门禁                   |
| `pnpm validate`        | 汇总版本、文本、格式、lint、类型检查和测试  | 不等于完整发布门禁，详见[剩余工作清单](docs/remaining-work.md) |

## 开发约定与工具接入概览

- 内容按 `apps/web/content/articles`、`apps/web/content/pages`、`apps/web/content/works` 归类，并遵守 `content.schema.ts` 与仓库校验脚本要求。
- 文章 frontmatter 使用 `draft`；作品 frontmatter 使用 `status`，可选值包括 `draft`、`alpha`、`beta`、`maintained`、`archived`。当前草稿不应被当作公开发布内容。
- 新工具应放在 `packages/tools/<tool-id>`，通过 `ToolManifest` 声明 `id`、运行时、状态、能力和组件 loader，再由主站 registry 接入。`@kunlun/tool-kit` 提供 registry 校验与 `toolId` 关联校验。
- `@kunlun/jd-skill-radar` 已有 `jdSkillRadarManifest` 和工具组件，但主站还没有把它注册到可访问的工具路由。
- 根目录 `prebuild` 会执行内容校验和工具关联校验；校验通过只说明当前结构满足脚本规则，不代表用户流程已经完成。
- 文本文件使用 UTF-8、LF 换行并保留末尾换行；提交前可运行 `pnpm validate:text` 和 `pnpm format:check`。

## 隐私边界

JD Skill Radar 的分析在浏览器本地完成，输入不会上传到服务端；首版分析也不保存 JD。当前项目不把服务端分析、账号、持久化或后端数据处理描述为已有能力。

## 当前限制

- 尚无主站工具注册插件和 `/tools/[toolId]` 动态路由，因此 `jd-skill-radar` package 不能通过主站工具入口访问。
- 尚无完整的内容集合索引、内容详情和草稿发布规则实现。
- `pnpm test:e2e` 脚本存在，但 Playwright 配置、导航/工具流程、响应式和 Axe 测试尚未建立。
- 尚无未知工具的明确 404 行为、`/api/health`、Docker Compose、非 root 容器、CI、Dependabot 自动合并限制和发布门禁。
- `pnpm validate` 是现有综合校验入口，但不能替代生产构建、E2E、可观测性和发布流程。

详细的优先级、依赖关系和可验证验收条件见[剩余工作清单](docs/remaining-work.md)。
