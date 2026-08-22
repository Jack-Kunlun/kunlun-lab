# 剩余工作清单

这份清单是 Kunlun Lab 的实时 backlog，记录当前尚未完成的可验证工作。`docs/superpowers/` 下的规格和计划属于历史过程文档，不替代本文件。

## 维护规则

- 每个条目只描述一个可以独立验收的结果；完成条件写在条目或所属分组的“验收条件”中。
- `[ ]` 表示未完成；`[x]` 表示已完成。进行中的条目保留未勾选状态，并在条目开头写明 `状态：进行中`、负责人和开始日期。
- 没有实现证据、验证命令或验收结果时，不得勾选完成；代码存在不等于用户流程可用。
- 依赖其他条目的工作，只有前置条目完成后才能进入进行中或完成状态。尤其是发布元数据同步依赖工具路由完成。
- 每次状态变化同时记录实际运行过的验证命令；不要把 `pnpm validate` 描述成完整发布门禁。
- 新发现的工作追加到最合适的优先级组，并写出影响范围和验收条件；不要把历史计划原样复制为实时事项。
- 本清单只记录工作状态，不替代 `apps/web/content/works` 中的内容元数据，也不在未做发布决策时擅自升级作品状态。

## 状态与优先级图例

| 标记           | 含义                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| `[ ]`          | 未完成；当前清单中的条目均从此状态开始。                                  |
| `[x]`          | 已完成；所属验收条件全部满足，并且验证证据已记录。                        |
| `状态：进行中` | 已开始但尚未满足全部验收条件；必须同时记录负责人和开始日期。              |
| `P0`           | 工具主流程与发布前置，阻塞 JD Skill Radar 从 package 进入主站可访问状态。 |
| `P1`           | 内容体验和用户质量门禁，影响主站基本可用性。                              |
| `P2`           | 运行、容器化、CI 与发布控制，影响可维护交付。                             |
| `P3`           | 内容深链和长期算法回归，影响持续演进质量。                                |

## 当前基线

- 已完成 monorepo、内容模型、UI 基础、`@kunlun/tool-kit`，以及 `@kunlun/jd-skill-radar` 包内 alpha（原计划 Task 1-10）。
- `apps/web` 已接入工具 registry 插件与 `/tools/[toolId]` 动态路由（Task 11），并实现内容集合（articles/works/pages）的索引与详情渲染（Task 12）。
- `jdSkillRadarManifest` 为 `client` runtime、`alpha` 状态，支持 `clipboard` 和 `download`；作品内容 [`apps/web/content/works/jd-skill-radar.md`](../apps/web/content/works/jd-skill-radar.md) 仍为 `draft`。已决定暂不公开发布：继续保持 manifest `alpha`、work `draft`、`featured: false`，不配置 `appUrl`；仅保留 `/tools/jd-skill-radar` 直接访问入口，不进入 `/works` 公开列表，且 `/works/jd-skill-radar` 继续保持 404。
- JD 分析在浏览器本地完成，不上传输入；清单不引入服务端分析或数据存储目标。
- 根目录已有 `dev`、`build`、`test`、`test:e2e`、`typecheck`、`lint`、`format:check`、`validate` 等脚本，且 `prebuild` 会执行内容与工具注册校验；`playwright.config.ts` 已就位，`pnpm test:e2e` 可运行 Chromium E2E（Task 13）。
- 已提供 `apps/web/server/api/health.get.ts`（`/api/health`）、`Dockerfile`（非 root 用户 UID 1001）、`compose.yaml`、`pnpm test:docker` 冒烟脚本（Task 14）。
- 已提供 `.github/workflows/ci.yml`（PR/main 门禁）、`.github/dependabot.yml`（禁止自动合并）与 `tests/repository/ci-policy.test.ts` 策略回归（Task 15）；CI 工作流已提交但尚未在托管 Runner 上实际运行验证，本地门禁结果见对应条目记录。
- 未勾选项目均表示未完成，不表示已经接近完成；条目状态以下方各优先级组的实际记录为准。

## P0：工具主流程与发布前置

- [x] **工具注册与 `/tools/[toolId]`（Task 11）** 将 `jdSkillRadarManifest` 接入 `apps/web` 的唯一工具 registry，并实现 `/tools/[toolId]` 动态路由；已注册工具加载对应 client component，未知 `toolId` 走明确的错误/404 分支。

  **验收条件：** 直接打开 `/tools/jd-skill-radar` 能渲染 JD Skill Radar 的标题、输入区和结果壳；刷新和直接导航均可用；registry 校验通过；已注册工具的 `toolId` 与作品 frontmatter 关联一致；未注册工具不会渲染任意工具组件。

  **实现与验证：** 工具 registry 与 `/tools/[toolId]` 动态路由由 Task 11 实现（`apps/web/pages/tools/[toolId].vue` + 工具 registry 插件已就位）；相关 E2E/可访问性回归由 Task 13 补充，`pnpm test:e2e` 覆盖工具页渲染、刷新与未知 `toolId` 404（106 passed + 14 skipped）。

- [x] **发布元数据同步（暂不公开发布决定）** 在工具路由完成并做出发布决定后，同步 `apps/web/content/works/jd-skill-radar.md` 与 manifest 和实际入口的元数据。

  **验收条件：** `toolId`、启动入口、标题、描述、`status` 和 `updatedAt` 能准确表达实际可访问状态；若仍为 alpha 或 draft，原因和入口策略明确；`validate-content` 与 `validate-tools` 通过；未通过发布决定前不把作品标为已发布。

  **发布决定与实现（2026-08-22）：** 本轮决定为“暂不公开发布”——保留 manifest `status: alpha` 与作品 `status: draft`，`featured` 保持 `false`，不添加 `appUrl`。直接入口为 [`/tools/jd-skill-radar`](../apps/web/pages/tools/%5BtoolId%5D.vue)，允许知道准确地址的用户直接访问 alpha 工具；`/works` 索引不展示该 draft 工具，`/works/jd-skill-radar` 作品详情仍不公开（返回 404）。作品元数据已同步：`title`（前端岗位 JD 技能雷达，与 manifest 一致）、`toolId`（jd-skill-radar，与 manifest id 一致）、`description`（浏览器本地的 JD 技能信号与准备清单）、`status: draft`、`updatedAt: 2026-08-22`；作品正文补充“当前发布策略”说明。

  **实际运行结果（本地）：** `validate:text` 通过；`prebuild`（内容 + 工具注册校验）通过；`test:repository` 14 passed；`prettier --check`（作品 md + remaining-work.md）全绿；`pnpm --filter @kunlun/web test:ssr` 通过（`/tools/jd-skill-radar` 可直达、`/works` 不含 draft 工具、`/works/jd-skill-radar` 与未注册 toolId 均 404）；`playwright test work-links.spec.ts jd-radar.spec.ts --project=desktop` 通过；`pnpm build` 6/6 通过；`git diff --check` 无空白错误。

## P1：内容体验与用户质量门禁

- [x] **内容集合、索引、详情与草稿规则（Task 12）** 为 `articles`、`pages`、`works` 建立明确的 collection query、索引页和详情页；写清文章 `draft` 与作品 `status: draft` 的生产环境可见性规则。

  **验收条件：** 每个集合都有可访问的索引和详情路径；有效内容可从索引进入详情；生产环境不会把草稿内容当作公开内容；缺失或不应公开的内容返回明确结果；现有 schema 与内容校验继续通过。

  **实现与验证：** 页面与草稿规则由 Task 12 实现（首页、`/articles`、`/works` 及其详情页已实现草稿过滤，`apps/web/tests/pages/content-pages.test.ts` 覆盖索引→详情、草稿不公开、未知 slug 404）；浏览器 E2E 回归由 Task 13 补充。

- [x] **Playwright 配置（Task 13）** 添加可运行的 Playwright 配置、浏览器项目、基础 server 启动方式和测试产物目录规则，不把脚本存在误认为 E2E 已可用。

  **验收条件：** 在干净依赖环境中，`pnpm test:e2e` 能发现并执行至少一条浏览器测试；配置包含明确的 base URL、启动命令、超时和失败产物策略；生成的报告目录不进入源码提交。

  **实现与验证：** `playwright.config.ts` 已就位（base URL、webServer、超时、`snapshotPathTemplate`、报告目录）；`pnpm test:e2e` 106 passed + 14 skipped；`playwright-report/`、`test-results/` 已在忽略列表。

- [x] **导航流程测试（Task 13）** 覆盖首页、关于、文章索引、作品索引及其公开详情之间的主要导航和浏览器刷新。

  **验收条件：** Playwright 测试从首页出发验证主导航目标、当前页面可辨识状态、返回路径和直接刷新；公开内容链接不落到未实现页面；失败时能定位到具体路由。

  **实现与验证：** E2E 导航 spec 覆盖主导航、当前页状态、刷新与公开链接可达（含 skip link 键盘焦点回归）。

- [x] **工具流程测试（Task 13）** 覆盖 `/tools/jd-skill-radar` 的输入、分析、结果展示，以及可用的复制和下载反馈；同时确认 JD 输入保持浏览器本地处理。

  **验收条件：** 测试使用固定 fixture 完成一次分析并断言岗位概览、技能分布或准备清单等结果；复制/下载成功或失败都有可观察反馈；测试期间没有向外部服务发送 JD 输入。

  **实现与验证：** E2E 工具 spec 使用固定 JD fixture 完成分析并断言结果区，复制/下载反馈可观察，含 stale 状态 live region 回归；JD 处理保持浏览器本地。

- [x] **响应式测试（Task 13）** 为主站内容页和 JD 工具页定义桌面与窄屏视口，并覆盖主要布局断点。

  **验收条件：** 预设桌面和移动视口下页面无水平溢出、核心操作可见且可操作、导航和工具结果没有被截断；测试视口与断言写入 Playwright 配置或测试文件。

  **实现与验证：** Playwright 项目定义桌面与窄屏视口，响应式 spec 断言无水平溢出与核心操作可见。

- [x] **Axe 可访问性测试（Task 13）** 将 `@axe-core/playwright` 接入关键页面和工具流程，在明确范围内执行自动化可访问性检查。

  **验收条件：** 首页、内容详情、工具页至少各有一条 Axe 检查；严重级别和检查范围明确；阻断级别问题会使 CI 失败，已知例外必须有代码位置和原因记录。

  **实现与验证：** `@axe-core/playwright` 接入首页、内容详情与工具页，阻断级别问题会使 E2E 失败（在 CI `e2e` job 内执行）。

- [x] **未知工具 404（Task 13）** 为 `/tools/<unknown-tool-id>` 建立稳定的 404 行为和回退体验。

  **验收条件：** 访问未知 `toolId` 返回 HTTP 404 或框架等价的 not-found 状态；页面不加载已注册工具组件；用户可以回到作品或首页；Playwright 有对应回归测试。

  **实现与验证：** `/tools/[toolId].vue` 对未注册 `toolId` 走 not-found 分支，不加载任意工具组件；E2E 覆盖未知工具 404 回归。

## P2：运行与交付控制

- [x] **`/api/health`（Task 14）** 提供最小健康检查接口，区分应用可响应与依赖异常，并定义稳定的 JSON 响应结构。

  **验收条件：** 健康时接口返回 HTTP 200、`application/json` 和文档化的成功状态；检查失败时返回非成功状态；响应不包含密钥、用户输入或内部敏感路径；至少有接口级测试或等价自动化验证。

  **实现与验证：** `apps/web/server/api/health.get.ts` 返回 `{ status: "ok" }`（200、`application/json`）；`apps/web/tests/server/health.test.ts` 覆盖成功响应；`pnpm test:docker` 冒烟确认 `/api/health status=ok`。

- [x] **Docker Compose（Task 14）** 提供可重复构建和启动 Web 服务的 Docker Compose 配置，并记录端口、环境变量和健康检查用法。

  **验收条件：** 在项目根目录按文档命令可以完成镜像构建、启动和停止；容器能提供主站与健康接口；服务不依赖把源码目录以可写方式挂入容器；生成物和密钥不被提交。

  **实现与验证：** `compose.yaml` + `Dockerfile` 多阶段构建（`turbo prune --docker`），无源码可写挂载；`pnpm test:docker` 构建启动后校验 homepage=200 与 `/api/health`，`docker compose ps` 无残留；README 记录端口/环境变量/健康检查用法。

- [x] **非 root 容器（Task 14）** 让生产运行容器使用明确的非 root 用户运行。

  **验收条件：** 容器内进程的有效 UID 不为 0；应用所需目录权限经过最小化配置；以非 root 用户启动不会因为写缓存或读取构建产物失败；构建检查记录该 UID 证据。

  **实现与验证：** `Dockerfile` 以 `nodejs`（UID 1001）非 root 用户运行入口 `node apps/web/.output/server/index.mjs`；`pnpm test:docker` 记录 `container UID=1001` 且服务正常响应。

- [x] **CI、Dependabot 禁止自动合并与发布门禁** 建立 PR/main CI，明确 Dependabot 更新不得自动合并，并把验证结果接入发布前门禁。

  **验收条件：** CI 使用仓库锁定的 Node.js 与 `pnpm` 版本并执行现有 `pnpm validate`、生产构建和已建立的 E2E/Axe 检查；任一必需检查失败都会阻断合并或发布；Dependabot 配置和仓库设置均不启用自动合并；发布门禁明确区分 `validate`、build、E2E、健康检查和容器检查，不能只把 `validate` 当作完整门禁。

  **实现与验证（2026-08-22，分支 `codex/task-15-ci-release-gates`）：**

  - `.github/workflows/ci.yml`：`pull_request` 与 `push` 到 `main` 触发，`permissions: contents: read`；三个 job `quality` / `e2e` / `docker`，`e2e` 与 `docker` 均 `needs: quality`；所有 job 用 `.node-version` 解析 Node、Corepack 激活 `pnpm@11.21.0`、`pnpm install --frozen-lockfile`。`quality` 依次执行 `validate:versions`、`validate:text`、`format:check`、`lint`、`typecheck`、`test`、`build`；`e2e` 执行 `playwright install --with-deps chromium` 后 `pnpm test:e2e`；`docker` 执行 `pnpm test:docker`。
  - `.github/dependabot.yml`：每周更新 npm 与 github-actions，`open-pull-requests-limit: 5`，重大版本升级单独开 PR；无 auto-merge / automerge / auto-approve / `pull_request_target`。
  - `tests/repository/ci-policy.test.ts`：以 `yaml` 解析工作流与 Dependabot 配置做结构化断言（node-version-file、frozen-lockfile、三门禁与依赖关系、禁止自动合并、Dependabot weekly 与生态系统），并接入 `pnpm test`（`test:ci-policy`）。
  - 本地实际运行结果（macOS，Node `.node-version`）：`vitest run tests/repository/ci-policy.test.ts` 18 passed；`validate:versions`、`validate:text`、`format:check`（全仓库）、`lint`（全仓库）、`typecheck`、`test`、`build` 均通过；`test:e2e` 106 passed + 14 skipped（视觉基线仅桌面）；`test:docker` 通过（`/api/health status=ok, homepage=200, container UID=1001`），`docker compose ps` 无残留。
  - 发布门禁验收补充（2026-08-22，`fix(ci): 修复发布门禁验收问题`）：清理了此前 P1/P2 遗留的 `pnpm lint` 13 个错误与 `pnpm format:check` 未格式化文件（仅 import/order、boolean 比较、`RegExp#exec`、空行、引号等机械修复与 Prettier 格式化，未改动组件渲染、路由、数据处理或测试断言），使全仓库 `lint` 与 `format:check` 门禁在本地一次性通过。
  - 待验证项：`ci.yml` 三门禁仅在本地按同等命令逐条执行通过，尚未在 GitHub 托管 Runner 上实际触发运行；托管环境的首次 CI 结果需在后续 PR 中确认。

## P3：内容深链与长期回归

- [x] **状态：已完成｜内容深链** 为公开文章、作品和相关内容链接提供可直接访问、可刷新、可分享的稳定路径。

  **验收条件：** 从新浏览器直接打开每类公开内容的深链并刷新，结果与站内导航一致；关联内容链接可解析；草稿深链不会绕过发布规则；未知 slug 返回明确 404；Playwright 覆盖至少一条文章和一条作品深链。

  - 回归补充（2026-08-22，`test(content): 完善公开内容深链回归`）：新增 `tests/e2e/content-deep-links.spec.ts`，覆盖文章深链 `/articles/building-a-personal-lab` 与作品深链 `/works/interview-notes` 的直接访问、刷新一致性；索引点击进入详情与直接访问结果一致；在新浏览器上下文重新打开分享 URL 结果一致（文章、作品各一条）；文章索引与作品索引内所有深链均返回 200（关联内容链接可解析）；未知文章 slug（`/articles/not-a-real-article`）与未知作品 slug 返回明确 404；草稿作品 `/works/jd-skill-radar` 仍返回 404（不绕过发布规则，既有 `tests/e2e/work-links.spec.ts` 覆盖）。路由实现（`apps/web/pages/articles/[...slug].vue`、`apps/web/pages/works/[...slug].vue`）经复核使用内容模型稳定 `path` 与统一 404 处理，SSR 与客户端一致，无需改动，本项仅补齐回归覆盖。
  - 本地验证：`validate:text`、`prebuild`、`typecheck:e2e` 通过；`apps/web` `test:ssr` 10/10 通过；Playwright（desktop）`content-deep-links.spec.ts` 9/9 通过，`work-links.spec.ts`+`navigation.spec.ts` 18/18 通过（无回归）；新文件 `prettier --check` 与 `eslint` 通过。
  - 草稿发布规则回归补充（2026-08-22，`test(content): 补充文章草稿深链回归`）：新增 `draft: true` 的文章夹具 `apps/web/content/articles/draft-deep-link-fixture.md`（标题「深链草稿回归夹具」，仅供测试），并在 `tests/e2e/content-deep-links.spec.ts` 补两项断言——「文章草稿不会进入公开索引」（`/articles` 内既无指向 `/articles/draft-deep-link-fixture` 的链接 href，也不显示草稿标题）与「文章草稿深链不会绕过发布规则」（直接访问 `/articles/draft-deep-link-fixture` 返回 404、展示统一「页面暂时无法访问」提示、不渲染草稿正文，刷新后仍为 404）。至此文章侧（本夹具）与作品侧（`/works/jd-skill-radar`）两类草稿的发布规则均有回归证据；若详情路由未来误删 draft 拦截，测试会失败。未改动任何现有公开内容状态、内容 schema 或路由实现，仅新增夹具与测试。
  - 本地验证（草稿回归）：`validate:text`、`prebuild`（内容校验通过，草稿夹具字段合法）、`typecheck:e2e` 通过；`apps/web` `test:ssr` 10/10 通过；Playwright（desktop）`content-deep-links.spec.ts`（11 项）+`work-links.spec.ts`（9 项）合计 20 项全部通过；新增夹具与测试文件 `prettier --check`、`eslint` 通过。

- [x] **状态：已完成｜技能词典回归** 为 JD Skill Radar 的技能词典、同义词匹配、分类和代表性岗位 fixture 建立持续回归覆盖。

  **验收条件：** 词典变更会触发固定 fixture 的回归测试；关键前端/Vue 技能词、同义词、未知词和分类结果都有稳定断言；现有 `packages/tools/jd-skill-radar` 单元测试与新增回归测试同时通过；测试失败能指出发生变化的技能或分类。

  - 回归实现（2026-08-22，`test(jd-radar): 补充技能词典回归`）：新增 `packages/tools/jd-skill-radar/src/domain/skill-dictionary-regression.test.ts`（41 项），全部以硬编码业务预期为准、不从 `SKILLS` 动态生成 expected；采用 table-driven + 描述性用例名，失败信息带技能 ID / alias / category / fixture 定位。复用现有固定 fixture `fixtures/frontend-vue.ts`，未新增第二份 Vue JD，未新增 fixture 文件。
  - 覆盖维度：（1）关键技能定义稳定性——对 javascript、typescript、vue、vue-router、pinia、css、vite、git、code-review 硬编码断言 `id`/`label`/`category`/关键 `alias`；（2）别名与同义写法匹配——14 个用例覆盖 TS/TypeScript、JS/JavaScript、Vue 3/Vue3/Vue.js、Vue Router/VueRouter、Node.js/NodeJS、Code Review/代码评审/代码审查，各断言匹配到明确 `skillId`；（3）未知词处理——含 Fortran/COBOL/Delphi/Haskell/Erlang（均已确认不在词典）的 JD 只识别 typescript、不生成伪造 skillId、不抛异常，且纯非技术文本返回 `NO_SKILLS`；（4）frontend-vue fixture 端到端——`analyzeJd` 识别固定 12 技能集合、无未知 skillId、typescript count=2/required 等关键词次数与语气、重复分析结果稳定；（5）分类回归——硬编码 id/category 对覆盖 language/framework/css/engineering/nodejs/collaboration 多个维度，并断言 fixture 分类得分/matchCount/排序与固定基线一致（framework 100/3、language 100/2、css 75/3、engineering 50/2、collaboration 50/2、nodejs 38/1）且分类仅由匹配技能产生。既有 `skill-dictionary.test.ts`（固定 ID 集合、ID/alias 唯一、label/checklistLabel 非空、无 noteUrl）等测试保留未改，未弱化。
  - 未修改任何生产实现（词典、匹配、分析、评分、类型、UI、manifest 均未动），未新增技能/别名/依赖，未改锁文件，仅新增一个领域单元测试文件与本文档记录。
  - 本地验证：新测试 `vitest run skill-dictionary-regression.test.ts` 41/41 通过；工具包完整 `pnpm --filter @kunlun/jd-skill-radar test` 20 文件 **156/156** 通过；`typecheck`（vue-tsc）通过；`validate:text` 通过；新测试文件 `prettier --check`、`eslint` 通过。

## 完成定义

单个条目只有在以下条件全部满足后才能标记 `[x]`：

- 实现已经存在，并且没有把未完成的旁路流程描述为可用能力。
- 条目列出的每一项验收条件都有可复现结果。
- 相关的最小测试、校验、构建或手工验证命令已经执行，并记录实际结果。
- 受影响的 README、路由、内容元数据或运行文档已经同步；涉及发布状态时有明确决定。
- 没有引入超出该条目范围的业务行为、未说明的依赖升级或安全风险。

优先级组只有在组内所有条目完成后才算完成。整个剩余工作清单只有在 P0-P3 的条目都满足上述定义、并完成一次面向发布的综合验证后，才能宣称已清空。
