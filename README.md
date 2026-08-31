# Kunlun Lab

Kunlun Lab 是一个前端开发者的个人主页与产品实验室，用来分享技术实践，并开发对工作和生活有用的小工具。项目采用 pnpm workspace + Turborepo 组织，主站基于 Nuxt，工具通过统一的 manifest 与 registry 协议接入，并在浏览器本地运行。

## 项目定位

- 个人主页与内容展示：文章、页面、作品三类内容集合，含索引与详情路由。
- 产品实验室：以 `@kunlun/tool-kit` 定义的工具协议接入前端小工具，首个工具为 JD Skill Radar（前端岗位技能雷达）。
- 强调可维护交付：仓库级策略校验、类型检查、E2E/可访问性/视觉测试、健康检查与容器化冒烟测试。

## 前置环境

| 依赖    | 版本来源                                                  | 说明                                                         |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Node.js | `.node-version`（当前 24.19.0）                           | 通过 Corepack 与 CI 统一版本，`engines.node` 约束为 `24.x`。 |
| pnpm    | `package.json` 的 `packageManager`（当前 `pnpm@11.21.0`） | 由 Corepack 激活精确版本，不使用浮动版本。                   |
| Docker  | Docker Engine + Compose v2                                | 仅运行 Docker 冒烟测试与本地容器部署时需要。                 |

Windows 用户使用 Docker Desktop 与 Node.js（Corepack 随 Node 提供）即可完成安装、测试与容器部署，跨平台脚本以 Node 实现，不依赖 Bash。

## 安装

先通过 Corepack 精确启用仓库指定的 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

随后使用锁定的依赖安装：

```bash
pnpm install --frozen-lockfile
```

## 本地开发

```bash
pnpm dev
```

开发服务器启动后按终端输出访问本地站点。可访问的主要路由：

- `/`、`/about`
- `/articles`、`/articles/[...slug]`
- `/works`、`/works/[...slug]`
- `/tools`（公开工具索引）
- `/tools/[toolId]`（公开 registry 中的工具渲染对应组件，未知 `toolId` 走明确的 not-found 分支）
- `/api/health`（HTTP/process liveness 接口）

> JD Skill Radar 是公开可发现和使用的 Alpha 工具：manifest `status: alpha`，会出现在 `/tools` 并可从 `/tools/jd-skill-radar` 使用；对应作品记录保持 `status: draft`，不会进入 `/works` 索引，`/works/jd-skill-radar` 作品详情返回 404。

## 目录结构

```text
apps/web/                         Nuxt 主站
  content/articles/               文章内容
  content/pages/                  页面内容
  content/works/                  公开作品内容
  content-drafts/works/           尚未公开的作品草稿（不属于 Nuxt Content source）
  pages/                          主站页面与动态路由
  plugins/tool-registry.ts        工具 registry 接入插件
  server/api/health.get.ts        HTTP/process liveness 接口
packages/shared/                  共享类型与基础结果模型
packages/ui/                      UI 组件与设计 token
packages/tool-kit/                工具 manifest、registry、ToolShell
packages/tools/jd-skill-radar/    前端岗位 JD 技能雷达 package
packages/eslint-config/           共享 ESLint 配置
scripts/                          内容、工具、版本与文本策略校验
tests/repository/                 仓库级策略测试（含 CI policy）
tests/e2e/                        Playwright E2E、Axe 可访问性与视觉测试
tests/docker/                     跨平台 Docker Compose 冒烟测试
docs/remaining-work.md            实时剩余工作清单
docs/superpowers/                 历史规格与计划，不作为实时 backlog
.github/workflows/ci.yml          持续集成工作流
.github/dependabot.yml            依赖更新配置（不启用自动合并）
```

## 代码风格与约定

- TypeScript：`tsconfig.base.json` 开启 `strict`、`noUncheckedIndexedAccess`、`verbatimModuleSyntax` 等严格选项。
- ESLint：`eslint.config.ts` 使用类型感知的 strict 规则集，`pnpm lint` 以 `--max-warnings 0` 运行。
- Prettier：`pnpm format:check` 检查格式，不自动修复。
- EditorConfig：`.editorconfig` 统一 UTF-8、LF 换行、2 空格缩进、保留末尾换行。
- 文本策略：源文本使用 UTF-8、LF 换行并保留末尾 LF，禁止 BOM 与 CRLF；由 `pnpm validate:text` 校验。

## 内容与工具契约

- 公开内容按 `apps/web/content/articles`、`apps/web/content/pages`、`apps/web/content/works` 归类，遵守 `apps/web/content.schema.ts` 与仓库校验脚本；草稿放在 `apps/web/content-drafts/` 并单独做 schema 校验。
- 文章 frontmatter 使用 `draft`；作品 frontmatter 使用 `status`（`draft` / `alpha` / `beta` / `maintained` / `archived`）。
- 新工具放在 `packages/tools/<tool-id>`，通过 `ToolManifest` 声明 `id`、运行时、状态、能力与组件 loader，再由 `apps/web/plugins/tool-registry.ts` 注册到主站；`@kunlun/tool-kit` 提供完整 registry 校验与 `toolId` 关联校验。完整 registry 保留并校验所有合法 manifest（包括 future `draft`），公开 registry 只暴露 `alpha`、`beta`、`maintained` 状态，工具页面不各自实现隐藏规则。
- `prebuild` 会执行内容校验与工具关联校验（`scripts/validate-content.ts`、`scripts/validate-tools.ts`）。

## 隐私边界

JD Skill Radar 的分析在浏览器本地完成，输入不会上传到服务端，也不在服务端保存 JD。项目不提供服务端分析、账号或数据持久化能力。

## 测试与校验命令

| 命令               | 用途                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `pnpm validate`    | 汇总校验：版本、文本、格式、lint、typecheck 与测试（非完整发布门禁）  |
| `pnpm typecheck`   | workspace 与根目录、E2E、Docker 冒烟脚本的 TypeScript 类型检查        |
| `pnpm test`        | 仓库级策略测试、CI policy 测试与各 workspace 单元测试                 |
| `pnpm test:e2e`    | Playwright E2E、Axe 可访问性、响应式与视觉测试（Chromium）            |
| `pnpm test:docker` | 跨平台 Docker Compose 冒烟测试（构建、启动、健康检查、非 root、清理） |

`pnpm test:e2e` 需要本地安装 Chromium（CI 使用 `pnpm exec playwright install --with-deps chromium`）。`pnpm test:docker` 需要本机运行 Docker Engine 与 Compose v2。

`pnpm validate` 是本地综合校验入口，但不等于完整发布门禁；完整门禁在 CI 中区分 quality、E2E 与 Docker 三类检查。

## 持续集成与依赖更新

- `.github/workflows/ci.yml` 在 `pull_request` 与 `push` 到 `main` 时运行，默认权限为 `contents: read`。
- CI 分为三个 job：`quality`（版本/文本/格式/lint/typecheck/test/build）、`e2e`（Playwright 全套）、`docker`（`pnpm test:docker`）；`e2e` 与 `docker` 均 `needs: quality`，quality 失败即阻断后续。
- 所有 job 使用 `.node-version` 解析 Node、Corepack 激活精确 pnpm，并以 `pnpm install --frozen-lockfile` 安装依赖。
- `.github/dependabot.yml` 每周更新 npm 与 GitHub Actions 依赖；不启用任何自动合并或自动批准，重大版本升级单独开 PR 供人工评审。

以上描述的是仓库中已建立的 CI 配置本身；本 README 不声称任何一次 GitHub Actions 运行已经通过，也不声称镜像已发布到任何 registry。

## 容器部署

```bash
docker compose up -d --build
docker compose down
```

- Liveness 接口：`GET /api/health`，成功时返回 HTTP 200、`application/json` 和精确 payload `{ "status": "ok" }`；它只表示进程已启动并能通过 HTTP 响应，不表示内容边界、外部依赖、托管 readiness 或发布版本。
- 生产成功响应提供兼容安全头：`Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin` 与 `X-Frame-Options: DENY`；`/api/health` 另返回 `Cache-Control: no-store`。404 等错误响应由 Nitro 的安全错误处理覆盖，JSON 错误分支使用更严格的禁脚本与 `no-referrer` 策略。
- 运行变量：`LAB_PORT`（宿主机映射端口，默认 3000）、`NODE_ENV`、`PORT`（容器内监听端口）、`HOST`（监听地址）；示例见 `.env.example`。
- 容器以非 root 用户运行。

域名、TLS、反向代理与 ICP 备案由部署环境负责，不在本仓库范围内。

## v1 非目标

以下能力明确不在当前版本范围内：登录、支付、评论、后台管理、AI 服务端分析、简历上传、多 JD 比较，以及域名 / TLS / 反向代理 / ICP 备案。

详细优先级、依赖关系与可验证验收条件见[剩余工作清单](docs/remaining-work.md)。
