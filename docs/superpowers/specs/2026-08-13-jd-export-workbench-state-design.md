# Task 9：JD Markdown 导出与工作台状态机设计

**日期：** 2026-08-13  
**状态：** 已确认，待实施计划  
**范围：** `@kunlun/jd-skill-radar` 的 Markdown 序列化、浏览器复制/下载适配器和无 UI 工作台状态机

## 1. 目标

Task 9 在已完成的 `analyzeJd` 领域管线之上增加本地导出和工作台状态管理，为 Task 10 的 Vue 工作台提供稳定、可测试的接口。

本任务必须：

- 将 `JdAnalysis` 确定性序列化为 Markdown；
- 管理输入、分析快照、清单勾选状态和短反馈；
- 将 Clipboard、Blob、Object URL 等浏览器副作用隔离在适配器中；
- 保持 JD 只在浏览器内处理，不引入网络、持久化或分析埋点；
- 保持工具 manifest 为 `draft` 且 capabilities 为空。

## 2. 非目标

本任务不实现：

- Vue 工作台、可视化布局或 ToolShell 集成；
- manifest 状态或 capabilities 变更；
- 原始 JD 或技能命中上下文导出；
- 重新匹配、重新评分或重新抽取岗位概览；
- localStorage、IndexedDB、Cookie、网络请求或遥测；
- PDF、Word、图片、简历、多 JD 或 AI 分析；
- 全仓构建、浏览器 E2E 或视觉基线。

## 3. 架构

采用依赖注入状态机，划分三层。

### 3.1 纯领域序列化

`domain/to-markdown.ts` 导出：

```ts
toMarkdown(analysis: JdAnalysis, checkedIds: ReadonlySet<string>): string
```

它只消费既有分析结果和稳定清单 ID，不访问浏览器全局，不保存源 JD，不调用匹配或评分函数。

### 3.2 浏览器适配器

`browser/` 提供两个小型适配器：

- `copyMarkdown(markdown): Promise<void>`：检测 Clipboard API 并复制文本；
- `downloadMarkdown(markdown, filename): void`：创建 Markdown Blob 和临时链接、触发下载，并确保撤销 Object URL。

适配器不吞掉失败；状态层将失败转换为安全反馈。适配器不提供网络或第三方降级方案。

### 3.3 工作台状态

`state/useJdRadar.ts` 接收依赖注入端口：

- `analyze`；
- `copy`；
- `download`。

状态层不直接依赖浏览器 API。默认组合可以使用 `analyzeJd` 与浏览器适配器，测试则注入确定性替身。

分析端口允许返回 `AnalyzeJdResult | Promise<AnalyzeJdResult>`。`analyze` 和 `retry` 动作统一返回 `Promise<void>`，因此即使默认 `analyzeJd` 为同步纯函数，Vue 消费者也能观察到显式 `analyzing` 状态，测试也能注入延迟或拒绝的分析端口。

## 4. Markdown 格式

输出章节顺序固定：

1. 标题与岗位概览；
2. 技能分布；
3. 关键词明细；
4. 准备清单；
5. 分值说明。

岗位概览包含岗位、经验、学历、地点或工作方式、主要框架。未识别字段输出 `未识别`。

技能分布按 `JdAnalysis.categories` 的既有顺序输出类别、强调分和命中数，不重新排序或归一化。

关键词明细按 `JdAnalysis.keywords` 的既有顺序输出：

- 标准技能名称；
- 类别；
- 命中次数；
- 语气。

不输出 `contexts`，避免导出 JD 原文片段。也不输出或接收完整 JD 正文。

准备清单按既有顺序输出。ID 存在于 `checkedIds` 时使用 `- [x]`，否则使用 `- [ ]`。存在已验证 `noteUrl` 时可在标签上输出 Markdown 链接；不推断链接。

末尾固定说明：分值仅表示当前 JD 文本的强调程度，不代表岗位好坏、用户能力或面试结果。

同一输入对象与同一勾选集合必须生成字节一致的 Markdown。Markdown 文本中的动态值需要避免破坏表格、列表或链接结构；实施计划必须为所选格式定义聚焦的转义测试。

## 5. 状态机

状态集合：

```text
idle | analyzing | ready | stale | invalid | failed
```

### 5.1 状态语义

- `idle`：初始或重置；无输入快照、分析结果和反馈。
- `analyzing`：正在执行分析。当前分析器同步，但保留该显式状态供 Task 10 呈现一致反馈。
- `ready`：最新输入已成功分析。
- `stale`：成功后输入被修改；分析结果对应旧输入。
- `invalid`：输入为空、过短、过长或没有已知技能。
- `failed`：分析器抛出非预期异常。

### 5.2 主要转换

```text
idle / invalid / failed -- analyze success --> ready
ready -- setInput(changed) --> stale
stale -- analyze success --> ready
ready / stale -- analyze typed error --> invalid
failed -- retry --> analyze latest input
any -- reset --> idle
```

行为约束：

- 从 `ready` 修改输入进入 `stale`，保留旧分析和旧勾选；
- 从 `stale` 成功重分析，替换分析并清空全部勾选；
- 任意成功分析都产生新的分析快照并清空勾选；
- typed input error 进入 `invalid`，清除旧分析和勾选，避免错误输入与旧结果并存；
- 只有分析器的非预期异常进入 `failed`；
- `retry` 使用最新输入；
- `reset` 清空输入、分析、勾选和反馈。

## 6. 导出动作与反馈

复制和下载只在存在分析快照时执行，因此 `ready` 和 `stale` 均可导出。`stale` 导出屏幕仍显示的旧分析，不使用最新未分析输入。

默认下载文件名固定为：

```text
jd-skill-radar.md
```

不从 JD 内容拼接文件名。

短反馈至少覆盖：

- `已复制 Markdown`；
- `已下载 Markdown`；
- stale 成功导出时明确说明导出的是过期结果；
- `复制失败，请重试`；
- `下载失败，请重试`。

浏览器复制或下载失败只更新反馈，保留 `ready` 或 `stale` 状态、分析结果和勾选。它们不进入全局 `failed`。开始新的用户动作时清除上一条反馈。

Task 9 仅提供反馈状态；Task 10 负责把反馈放入 `aria-live="polite"` 区域。

## 7. 公开接口

包根新增公开接口：

- `toMarkdown`；
- `copyMarkdown`；
- `downloadMarkdown`；
- `useJdRadar`；
- Task 9 所需的状态、反馈、快照和依赖端口类型。

`useJdRadar(options)` 使用 Vue `ref` 管理内部状态，并返回 `Readonly<Ref<...>>` 形式的只读响应式状态：

- `input`；
- `status`；
- `analysis`；
- `checkedIds`；
- `feedback`。

返回动作：

- `setInput`；
- `analyze`；
- `retry`；
- `toggleChecklist`；
- `copyMarkdown`；
- `downloadMarkdown`；
- `reset`。

`snapshot()` 返回稳定、可测试的普通对象，不暴露可写内部集合。公开 API 必须保留 Task 7 和 Task 8 的既有导出。

`checkedIds` 对外暴露只读集合视图；toggle 和 reset 必须替换内部集合，而不是让调用方取得可写引用。反馈使用带稳定 code 和中文 message 的只读对象，Task 10 只渲染 message。

## 8. 测试设计

### 8.1 Markdown 纯函数

覆盖：

- 固定章节顺序；
- 岗位概览及 `未识别`；
- 类别、关键词与清单既有顺序；
- `[x]` / `[ ]`；
- 可选已验证链接；
- 固定分值说明；
- 确定性输出；
- 不包含完整 JD 或 `contexts`；
- 动态文本不会破坏所选 Markdown 结构。

### 8.2 浏览器适配器

覆盖：

- Clipboard API 存在与缺失；
- 复制失败向上抛出；
- Blob 类型与文本内容；
- 固定下载文件名；
- 临时链接点击；
- 成功或失败后的 Object URL 撤销和 DOM 清理。

### 8.3 状态机

覆盖：

- `idle → analyzing → ready`；
- `ready → stale` 保留旧分析和勾选；
- stale 成功重分析清空勾选；
- typed input error 进入 `invalid` 并清空旧结果；
- unexpected exception 进入 `failed`；
- `retry` 使用最新输入；
- ready/stale 的复制和下载；
- 浏览器动作失败只更新反馈；
- checklist toggle；
- `reset` 完全清空；
- snapshot 不泄露可写集合。

### 8.4 包边界

从包根导入 Task 9 API，验证不会加载或执行懒加载 Vue 组件，并验证原 Task 7/8 公开 API 仍存在。

## 9. 验证范围

实施阶段采用 TDD，并限制最终门禁为：

- `@kunlun/jd-skill-radar` 聚焦及完整包测试；
- 包 typecheck；
- Task 9 作用域 ESLint 和 Prettier；
- `git diff --check`；
- 一次包根导入探针。

不运行根级测试、生产构建、浏览器 E2E 或视觉测试。这些留给 Task 10 及后续集成任务。

## 10. 风险与后续衔接

- 状态层必须避免把 Vue 展示状态与领域状态混为一谈；Task 10 负责映射到 ToolShell。
- 复制与下载是浏览器能力，但 manifest capabilities 仍在 Task 10 真正发布工作台时更新。
- `stale` 导出必须始终序列化旧分析快照，不能混入最新输入。
- Task 10 只消费本任务的状态和动作，不重复实现 Markdown、Clipboard 或下载逻辑。
