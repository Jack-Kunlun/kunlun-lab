# Task 10：JD 技能雷达 Vue 工作台设计

**日期：** 2026-08-14
**状态：** 已确认，待实施计划
**范围：** `@kunlun/jd-skill-radar` 包内正式 Vue 工作台、展示组件、响应式样式及工具清单升级

## 1. 目标

Task 10 在已完成的 JD 分析管线与 Task 9 工作台状态机之上，实现可交互、可访问的 Vue 工作台，并将工具清单从建设中草稿升级为可供后续站点集成的 `alpha` 工具。

本任务必须：

- 使用 `useJdRadar()` 作为唯一工作台状态与动作来源；
- 呈现输入、岗位概览、技能分布、关键词明细、准备清单和 Markdown 导出操作；
- 明确呈现 `idle`、`analyzing`、`ready`、`stale`、`invalid`、`failed` 六种状态；
- 保留浏览器本地分析、无网络、无持久化的隐私边界；
- 延续 B1“控制台仪表盘”视觉方向，并提供小于 `900px` 的单栏布局；
- 将 manifest 升级为 `alpha`，声明真实使用的 `clipboard` 与 `download` 能力，并继续懒加载正式工作台组件。

## 2. 非目标

本任务不实现：

- Nuxt 工具路由、作品页入口或 Markdown 内容接线；
- `ToolShell` 的外层加载、错误隔离与重试；
- `apps/web/content/works/jd-skill-radar.md` 的发布状态变更；
- 分析算法、技能字典、评分、Markdown 生成、复制或下载适配器的重新实现；
- 网络请求、遥测、localStorage、IndexedDB、Cookie 或跨会话恢复；
- AI 分析、简历、多 JD、PDF、Word、图片或岗位比较；
- 根级 E2E、生产构建、Docker 或视觉回归。

Task 11 负责站点路由、工具注册、`ToolShell` 外层边界、作品内容发布和生产集成验证。在 Task 11 完成前，站点作品元数据继续保持 `draft`。

## 3. 架构与组件边界

采用“根组件编排状态，子组件只负责展示与发出用户意图”的结构。子组件不创建第二个状态机，不调用领域分析函数，也不直接访问浏览器能力。

### 3.1 `JdSkillRadar.vue`

正式工作台根组件，职责为：

- 创建唯一的 `useJdRadar()` controller；
- 接收可选的 `options?: UseJdRadarOptions` 并传给 `useJdRadar(options)`；生产懒加载不传参数，组件测试用它注入可控端口；
- 将 controller 的响应式状态映射为六种页面状态；
- 把只读数据和必要动作传给子组件；
- 组织桌面双栏和移动端单栏结构；
- 提供统一的 `aria-live="polite"` 反馈区域；
- 显式导入本包 `styles.css`，保证懒加载组件时样式一并可达。

根组件不嵌套 `ToolShell`，不捕获站点级组件加载异常，也不重新实现 Task 9 的状态转换。

### 3.2 `JdInputPanel.vue`

纯输入与操作组件，接收当前输入、状态和反馈，发出：

- 输入更新；
- 分析；
- 重试；
- 重置。

它包含可见标签的原生 `textarea`、字符计数、主操作按钮、状态或校验提示和本地隐私说明。它不持有分析结果，也不自行判断输入是否合法。

### 3.3 `JdOverview.vue`

展示岗位线索、工作年限、学历、城市或工作方式及主要框架。空字符串或空框架集合统一呈现“未识别”，不得根据其他字段推断缺失信息。

### 3.4 `SkillDistribution.vue`

按 `analysis.categories` 的既有顺序展示分类强调分和命中数。每项使用原生 `<meter>`，并同时显示类别名称、数值和命中次数，保证含义不依赖颜色。

### 3.5 `KeywordDetails.vue`

按 `analysis.keywords` 的既有顺序展示标准技能、分类、累计命中次数、最强语气和所有上下文。

上下文默认完整展示，不折叠、不截断。长技能名和长上下文必须自然换行，不产生页面级横向滚动。组件只消费聚合结果，不重新匹配或排序。

### 3.6 `PreparationChecklist.vue`

按既有顺序展示准备项，使用原生复选框并发出 item ID。勾选状态完全由 controller 的只读 `checkedIds` 决定。

仅当条目存在已验证 `noteUrl` 时显示知识库链接；没有链接时不渲染占位入口，也不猜测地址。复制和下载操作与清单同区呈现，但调用根组件传入的 Task 9 动作。

## 4. 数据流

```text
用户输入
  → JdInputPanel 发出 input/update intent
  → JdSkillRadar 调用 controller.setInput
  → controller 更新 status / feedback / analysis
  → JdSkillRadar 按状态决定结果区是否存在
  → 展示组件只读渲染 analysis 与 checkedIds

分析 / 重试 / 清单切换 / 复制 / 下载 / 重置
  → 子组件发出 intent
  → JdSkillRadar 调用对应 controller action
  → controller 成为唯一状态变更来源
```

组件不得把 `analysis`、`checkedIds` 或 `feedback` 复制为第二份可写业务状态。局部 DOM 或展示状态可以存在，但不能改变 Task 9 状态机语义。

## 5. 页面状态与交互

### 5.1 `idle`

- 输入区居中并占据主要空间；
- 不渲染结果区、导出操作或虚假占位结果；
- 展示用途边界与本地隐私说明。

### 5.2 `analyzing`

- 保留当前输入；
- 禁用重复分析操作；
- 使用文字和 `aria-live="polite"` 宣告正在分析；
- 不展示尚未产生的新结果。

### 5.3 `ready`

- 桌面端左侧输入、右侧完整结果；
- 依次展示岗位概览、技能分布、关键词明细和准备清单；
- 显示复制 Markdown、下载 Markdown 和清空重置操作。

### 5.4 `stale`

- 保留旧分析结果和旧清单勾选状态；
- 在结果上方明确显示“输入已修改，当前结果已过期”；
- 允许查看和导出屏幕中的旧结果；
- 导出反馈继续使用 Task 9 已定义的过期结果消息；
- 过期状态必须有文字或符号，不只改变颜色。

### 5.5 `invalid`

- 在输入区附近显示 controller 提供的安全校验消息；
- 不显示旧结果、清单或导出操作；
- `NO_SKILLS` 的界面文案说明未识别到前端技能关键词，并建议确认内容是否为完整的前端岗位 JD；
- 不暴露内部异常对象或实现细节。

### 5.6 `failed`

- 显示“分析失败，请重试”一类安全提示；
- 提供使用最新输入重试的操作；
- 不显示异常对象、异常消息或堆栈；
- 不承担 `ToolShell` 的外层组件加载失败处理。

### 5.7 通用动作

- 分析、重试、重置、复制和下载使用原生按钮；
- 清单使用原生复选框；
- `reset` 后界面回到 `idle`，输入、结果、勾选和反馈均清空；
- 复制和下载只在存在分析快照时显示；
- controller 的 `feedback.message` 进入统一的 `aria-live="polite"` 区域。

## 6. 视觉与响应式布局

工作台沿用已确认的 B1“控制台仪表盘”方向：

- 深色石墨背景与低对比网格；
- 高亮绿色用于主要交互、在线状态和主要数据标记；
- 紫色仅用于次级实验状态、语气或知识库链接；
- 状态、模块编号和技术标识使用等宽字体；
- 中文正文使用系统无衬线字体；
- 结构保持紧凑，但不牺牲正文可读性。

正式样式优先复用 `packages/ui` 的设计令牌及适用组件。`textarea`、`meter` 和 `checkbox` 保持原生语义，不为了视觉统一重建伪控件。

桌面端结果状态使用：

```css
grid-template-columns: minmax(18rem, 0.85fr) minmax(0, 1.45fr);
```

小于 `900px` 后改为单栏，输入在上、结果在下。窄屏下模块内容继续换行，不通过缩小正文、内部横向滚动或隐藏上下文来维持双栏。

`styles.css` 由 `JdSkillRadar.vue` 显式导入；包根不主动导出或加载 `.vue` 文件，以保留 manifest 的懒加载边界。

## 7. 文案与隐私边界

工作台始终提供以下信息：

- JD 只在浏览器本地处理；
- 不上传、不记录，默认不跨会话保存；
- Markdown 在本地生成；
- 技能分值只表示当前 JD 文本的强调程度；
- 结果不代表岗位质量、用户能力或面试结果。

页面不得声称使用 AI，不得暗示已经评估候选人能力，也不得承诺岗位推荐或面试预测。

## 8. 错误与可访问性

- 工作台区域只保留一个主标题，子模块使用顺序正确的标题层级；
- `textarea` 有可见标签，并通过描述或错误关联到字符计数和校验消息；
- 所有按钮具有可理解的可见名称；
- 每个复选框与完整准备项标签关联；
- 操作和状态反馈使用 `aria-live="polite"`，但不重复宣告装饰性状态；
- `<meter>` 附带可读分类名和数字文本；
- 错误、过期和运行状态都有文字或符号说明，不能只靠颜色；
- 保留项目全局焦点样式与 `prefers-reduced-motion` 行为；
- 长关键词、上下文和 URL 使用安全换行策略；
- 普通界面不渲染堆栈、异常对象或未经筛选的内部错误消息。

## 9. Manifest 与包边界

`jdSkillRadarManifest` 更新为：

```ts
{
  id: "jd-skill-radar",
  title: "前端岗位 JD 技能雷达",
  runtime: "client",
  status: "alpha",
  capabilities: ["clipboard", "download"],
  component: () => import("./components/JdSkillRadar.vue"),
}
```

要求：

- 工具 ID、标题和 client-only runtime 不变；
- capabilities 只声明工作台真实使用的能力；
- component 保持动态导入，不在 manifest 求值时加载 Vue 组件；
- 包根继续导出 Task 7、8、9 的公开 API；
- 包根不新增 `JdSkillRadar.vue` 的 eager export；
- 原 `JdSkillRadarDraft.vue` 在正式组件替代后删除，不保留第二个 manifest 或无引用草稿入口。

现有 `manifest.test.ts` 和 `index.test.ts` 中关于 `draft`、空 capabilities 与建设提示的断言必须同步更新。Task 10 不修改 `apps/web` 作品元数据，避免在真实路由可用前显示虚假体验入口。

## 10. 测试设计

采用组件行为测试，不重复 Task 7 至 Task 9 已覆盖的领域和状态机内部逻辑。

### 10.1 根组件

覆盖：

- `idle` 只显示输入，不显示结果；
- 分析动作进入 `analyzing` 并防止重复提交；
- `ready` 渲染全部结果模块；
- 修改已分析输入后显示 `stale` 横幅并保留结果；
- `invalid` 显示安全校验消息并隐藏结果；
- `failed` 显示安全失败提示和重试操作；
- 重置返回 `idle`；
- 复制、下载和清单操作连接到 controller；
- 反馈位于 polite live region。

根组件测试通过可选 `options` 注入可控的分析、复制和下载端口，避免重复验证 `analyzeJd` 算法或浏览器 API。不得再增加第二个 controller factory 或仅供测试使用的全局状态。

### 10.2 子组件

只覆盖各组件的重要公开行为：

- 输入标签、字符计数和主要 intent；
- 空概览字段显示“未识别”；
- 分值同时存在 `<meter>`、数值和命中次数；
- 关键词顺序、累计次数、语气及完整上下文；
- 原生清单勾选、item ID 事件和可选知识库链接；
- 长文本仍保留在 DOM 中，不因展示逻辑被截断。

### 10.3 Manifest 与包边界

覆盖：

- `alpha` 状态；
- 精确 capabilities `clipboard`、`download`；
- 动态组件可加载正式 `JdSkillRadar.vue`；
- 懒加载前不会执行或挂载工作台；
- 既有包根公开 API 保持可用。

## 11. 验证范围

实施阶段采用 TDD，最终门禁限制为：

- `@kunlun/jd-skill-radar` 聚焦组件测试及完整包测试；
- 包级 typecheck；
- Task 10 作用域 ESLint 与 Prettier；
- `git diff --check`；
- 一次 manifest 懒加载或包边界探针。

不运行根级测试、全仓 lint、生产构建、Docker、浏览器 E2E 或视觉回归。Nuxt 集成与更广验证留给 Task 11，避免过度校验。

## 12. 风险与后续衔接

- 根组件必须消费 Task 9 controller，不能产生第二套业务状态；
- `stale` 必须保留旧结果，但 `invalid` 和 `failed` 不得展示误导性的旧结果；
- 完整上下文可能较长，布局必须通过换行解决，不能静默截断；
- `clipboard` 与 `download` 是 manifest 的真实能力声明，不代表站点已完成路由发布；
- Task 10 完成后工具包处于 `alpha`，但作品内容仍是 `draft`；Task 11 完成注册、路由与外层错误隔离后再同步发布状态；
- Task 11 负责在实际页面中确认 `ToolShell`、工作台和作品说明可以独立失败且不破坏站点导航。
