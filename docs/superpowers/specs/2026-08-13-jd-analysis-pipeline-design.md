# JD 分析聚合管线设计

## 目标

Task 8 在 Task 7 的确定性技能匹配事实之上，建立纯 TypeScript 的 JD 分析聚合管线。它负责输入状态、岗位概览、技能关键词聚合、类别强调分、准备清单和分析元数据。

本任务的结果将由 Task 9 的 Markdown 导出与状态机直接消费。它不实现导出、浏览器状态管理、Vue 工作台或工具发布状态变更。

## 范围

本任务在 `packages/tools/jd-skill-radar/src/domain/` 中新增纯函数模块与聚焦测试，并更新该领域的公共导出。

本任务同时修正有限技能词典中的类别归属：

- `CSS` 从 `language` 调整为 `css`；
- `Sass` 从 `language` 调整为 `css`；
- `Tailwind CSS` 保持为 `css`。

本任务不修改：

- Task 7 的别名匹配、重叠消解、原文索引或局部语气判断；
- `jdSkillRadarManifest` 的 `draft` 状态、能力或异步组件；
- Vue 草稿组件与主站页面；
- Task 9 的 Markdown 导出与工作台状态机；
- `E:\interview-notes` 仓库或知识库内容；
- 依赖版本、锁文件或构建配置。

## 架构

分析管线由职责单一的纯函数组成：

```text
原始 JD 文本
→ validateInput
→ matchSkills
→ aggregateKeywords
→ extractOverview
→ scoreCategories
→ buildChecklist
→ analyzeJd
→ AnalyzeJdResult
```

模块职责：

- `validate-input.ts`：验证空白、最小长度和最大长度；
- `aggregate-keywords.ts`：按 canonical skill 聚合次数、最高语气、上下文和累计权重；
- `extract-overview.ts`：只从明确证据中提取岗位、经验、学历、地点或工作方式，并从聚合技能中选取主要框架；
- `score-categories.ts`：按每次命中的语气权重累计并归一化类别分数；
- `build-checklist.ts`：按 canonical skill 去重生成稳定的准备项；
- `analyze-jd.ts`：串联上述模块并返回非抛错的判别联合结果。

Task 8 直接消费 Task 7 已公开的 `SKILLS`、`matchSkills`、`RawSkillMatch`、`RequirementTone` 和 `SkillCategory`。它不得重新扫描别名、重新判断局部语气或重新执行重叠消解。

## 公共类型与接口

### 输入错误

```ts
export type JdInputErrorCode = "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "NO_SKILLS";

export interface JdInputError {
  code: JdInputErrorCode;
  message: string;
}
```

错误文案使用稳定中文文本：

| code        | message                                     |
| ----------- | ------------------------------------------- |
| `EMPTY`     | `请粘贴一份前端岗位 JD。`                   |
| `TOO_SHORT` | `JD 内容过短，请提供更完整的岗位描述。`     |
| `TOO_LONG`  | `JD 内容超过 20,000 个字符，请缩短后重试。` |
| `NO_SKILLS` | `没有识别到当前词典支持的前端技能。`        |

### 分析结果

```ts
export interface JdOverview {
  role: string;
  experience: string;
  education: string;
  location: string;
  primaryFrameworks: string[];
}

export interface JdCategoryScore {
  category: SkillCategory;
  score: number;
  matchCount: number;
}

export interface JdKeyword {
  skillId: string;
  label: string;
  category: SkillCategory;
  count: number;
  tone: RequirementTone;
  contexts: string[];
}

export interface JdChecklistItem {
  id: string;
  label: string;
  noteUrl?: string;
}

export interface JdAnalysis {
  overview: JdOverview;
  categories: JdCategoryScore[];
  keywords: JdKeyword[];
  checklist: JdChecklistItem[];
  meta: {
    characterCount: number;
    skillCount: number;
    categoryCount: number;
  };
}

export type AnalyzeJdResult = { ok: true; value: JdAnalysis } | { ok: false; error: JdInputError };
```

公共入口：

```ts
export const MIN_JD_LENGTH = 80;
export const MAX_JD_LENGTH = 20_000;
export function analyzeJd(text: string): AnalyzeJdResult;
```

`AnalyzeJdResult` 使用本包明确的判别联合结构，不要求消费者捕获普通输入异常。

## 输入验证

验证顺序固定为：

1. 使用 `text.trim()` 判断是否为空；为空返回 `EMPTY`；
2. 以原始 `text.length` 计算 UTF-16 code units；少于 `80` 返回 `TOO_SHORT`；
3. 超过 `20_000` 返回 `TOO_LONG`；
4. 长度合法后执行 `matchSkills(text)`；没有命中返回 `NO_SKILLS`；
5. 存在命中时进入聚合管线。

首尾空白只用于空值判断，不改写送入匹配器和概览提取器的原始文本。`meta.characterCount` 始终等于原始 `text.length`。

## 关键词聚合

每条 `RawSkillMatch` 按 `skillId` 关联 `SKILLS`。未知 ID 表示内部契约破坏，应抛出明确的开发期错误，而不是静默丢弃；正常 `analyzeJd` 路径只会收到 Task 7 产生的有效 ID。

同一 canonical skill 的聚合规则：

- `count` 为非重叠原始命中的数量；
- `tone` 取所有命中的最高语气；
- `contexts` 按原始命中顺序收集，完全相同的字符串只保留第一次；
- 累计权重为每次命中对应权重之和；
- 每个关键词只返回一项。

语气优先级和权重固定为：

```text
required = 4
preferred = 3
familiar = 2
neutral = 1
```

关键词最终按累计权重降序、`count` 降序、展示名升序、`skillId` 升序稳定排序。累计权重是内部聚合事实，不进入 `JdKeyword` 公共字段。

## 类别评分

类别评分按每一条非重叠命中累计，不按 canonical skill 去重。同一技能在 JD 中重复出现会重复贡献权重，用来表达文本的重复强调。

对每个实际出现的类别：

1. 累加该类别全部命中的语气权重，得到原始权重；
2. 统计该类别全部命中数量，得到 `matchCount`；
3. 以当前最高类别原始权重为基准，计算 `round(rawWeight / maxRawWeight * 100)`；
4. 实际出现类别的归一化结果最低为 `1`，最高为 `100`；
5. 未出现类别不返回。

最终按 `score` 降序、`matchCount` 降序、下列固定类别顺序排列：

```text
language
framework
css
engineering
performance
nodejs
cross-platform
devops
collaboration
```

分值只表示当前 JD 文本的强调程度，不表示岗位质量、用户能力或面试结果。

## 岗位概览

所有缺少明确证据的字符串字段返回 `未识别`。概览提取不调用网络、不维护开放式知识库，也不从技术组合推断岗位信息。

### 岗位名称

按以下顺序提取：

1. 优先识别行首明确字段：`岗位：`、`职位：`、`招聘职位：`，同时接受 ASCII 冒号；取冒号后的本行文本并裁剪空白；
2. 若没有明确字段，只检查前 5 个非空行中的短标题行；
3. 标题行长度不得超过 40 个 UTF-16 code units，并且必须包含 `前端`、`开发`、`工程师` 中至少一个岗位词；
4. 包含句末标点或以 `职责`、`要求`、`描述` 开头的行不作为标题；
5. 仍无证据时返回 `未识别`。

明确字段的值为空时继续寻找下一条证据，不返回空字符串。

### 工作经验

识别以下明确形式，其中数字使用阿拉伯数字：

- `3-5年`、`3–5 年`、`3~5 年` 规范化为 `3–5 年`；
- `3年以上`、`3 年及以上` 规范化为 `3 年以上`；
- `至少3年` 规范化为 `3 年以上`。

多个条件并存时选择原文中最早出现的完整条件，不计算交集，不从“经验丰富”等模糊措辞推断。

### 学历

识别明确学历词并规范化：

- `博士` → `博士`；
- `硕士`、`研究生` → `硕士`；
- `本科` → `本科`；
- `大专`、`专科` → `大专`；
- `学历不限` → `学历不限`。

匹配按原文最早位置选择；`学习能力` 等包含相似汉字但不包含完整学历词的文本不得命中。

### 地点与工作方式

地点只识别行首明确字段：`工作地点：`、`地点：`、`城市：`，同时接受 ASCII 冒号。值只取冒号后的本行文本并裁剪首尾空白，不维护城市白名单，也不从普通职责描述中猜测。

工作方式只识别下列明确短语：

- `远程办公`；
- `混合办公`；
- `现场办公`。

同时存在地点和工作方式时返回 `<地点> / <工作方式>`。两者都不存在时返回 `未识别`；仅存在其中一项时返回该项。

### 主要框架

主要框架只从已聚合且 `category === "framework"` 的关键词产生，不从文本重新匹配，也不推断技术关系。例如 `Next.js` 不自动补出 `React`。

按关键词累计权重降序、`count` 降序、展示名升序、`skillId` 升序排列，最多返回 3 个 `label`。没有框架命中时返回空数组。

## 准备清单

每个聚合后的 canonical skill 生成一个准备项：

- `id` 固定为 `prepare:<skillId>`；
- `label` 直接使用 `SkillDefinition.checklistLabel`；
- 排序与关键词一致：最高语气权重对应的语气优先级降序、命中次数降序、展示名升序、`skillId` 升序；
- 只有字典中存在经过验证的 `noteUrl` 时才添加该属性；
- 当前 `VERIFIED_NOTE_LINKS` 为空，因此所有清单项都省略 `noteUrl`，不得写入 `undefined` 或猜测链接。

这里的首排序键是单技能最高语气，不是累计权重；因此一项明确的 `required` 技能优先于只有多次 `neutral` 命中的技能。相同最高语气下，再按命中次数排序。

## 元数据

```ts
meta: {
  characterCount: text.length;
  skillCount: keywords.length;
  categoryCount: categories.length;
}
```

- `characterCount` 使用原始输入长度；
- `skillCount` 表示去重后的 canonical skill 数量；
- `categoryCount` 表示实际出现并返回的类别数量。

## 错误与确定性

- 普通输入错误通过 `AnalyzeJdResult` 返回，不抛异常；
- 内部 skill ID 与静态词典不一致属于开发错误，允许抛出明确异常；
- 所有输出排序都有显式稳定次序；
- 不使用当前时间、随机数、网络、文件系统或运行时配置；
- 不保留用户输入，不写入浏览器存储；
- 输出不包含完整原始 JD 正文，只保留 Task 7 已裁剪的证据上下文；
- `CSS`、`Sass` 和 `Tailwind CSS` 必须全部进入 `css` 类别。

## 测试设计

聚焦测试至少覆盖：

1. 空白、过短、过长和合法长度但无技能命中的四种错误；
2. 合法 JD 返回 `ok: true`，原始字符数、去重技能数和实际类别数正确；
3. 同一技能重复命中按每次命中累计，确实提高类别原始权重和归一化结果；
4. `CSS`、`Sass`、`Tailwind CSS` 全部进入 `css` 类别；
5. 关键词的次数、最高语气、上下文去重和稳定排序；
6. 明确字段和前 5 个非空短标题的岗位提取，以及职责行不被误判；
7. 工作年限规范化和多条件时选择最早证据；
8. 学历规范化、`学历不限` 和“学习能力”反例；
9. 明确地点字段、三种工作方式、组合输出，以及普通职责中的城市名不被猜测；
10. 主要框架最多 3 项，并证明 `Next.js` 不推断 `React`；
11. 清单按最高语气、次数、名称稳定排序，ID 稳定且空链接属性被省略；
12. `NO_SKILLS` 优先于任何概览输出，不返回部分成功结果；
13. package root 导出 `analyzeJd`、常量和公共类型，但仍不执行惰性 Vue 组件加载。

TDD 为每个生产单元保留一次真实 RED/GREEN。评分模块进行一次必要 mutation：临时将重复命中改为每技能只计一次，要求重复强调回归测试失败；恢复后只重跑评分或分析聚焦测试。

最终验证限于 `@kunlun/jd-skill-radar` 的聚焦测试、typecheck、变更文件 ESLint/Prettier、`git diff --check` 和一次包根 Node 导入探针。不运行全仓测试或生产构建；这些留给后续工作台和集成任务。

## Task 9 衔接

Task 9 直接消费 `JdAnalysis`：

- 将 `overview`、`categories`、`keywords` 和 `checklist` 渲染为 Markdown；
- 使用稳定的 checklist ID 管理勾选状态；
- 在导出中保留“分值仅表示当前 JD 文本强调程度”的说明；
- 不重新匹配原文、不重新评分、不重新抽取概览；
- 不导出完整原始 JD 正文。
