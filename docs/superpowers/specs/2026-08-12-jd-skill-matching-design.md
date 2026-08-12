# JD 技能词典与要求语气设计

## 目标

Task 7 为前端岗位 JD 技能雷达建立确定性的领域基础：有限技能词典、边界感知的别名匹配、非重叠命中和局部要求语气判断。输出必须能被 Task 8 直接聚合，同时不得提前实现次数汇总、类别评分、岗位概览或准备清单排序。

## 范围

本任务新增 `packages/tools/jd-skill-radar/src/domain/` 下的纯 TypeScript 模块和聚焦测试。

本任务不修改：

- `jdSkillRadarManifest` 的 `draft` 状态、能力或异步组件；
- Vue 草稿组件和任何页面；
- Task 8 的输入校验、岗位概览、类别计分和分析管线；
- Task 9 的 Markdown 导出和状态机；
- `E:\interview-notes` 仓库或其中内容。

## 公共领域契约

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

`start` 为原始 JD 文本中命中的 UTF-16 起始索引，`end` 为不包含尾部的 UTF-16 索引。`alias` 保留原文实际命中的大小写和字符形式，而不是词典中的规范写法。

公开入口：

```ts
export const SKILLS: readonly SkillDefinition[];
export function matchSkills(text: string): RawSkillMatch[];
export function detectTone(context: string): RequirementTone;
```

Task 8 可以使用 `skillId` 关联 `SKILLS`，按 `RawSkillMatch` 数量统计出现次数，并按语气优先级聚合。Task 8 不应重新扫描 JD 原文来重建匹配事实。

## 有限首版词典

首版只覆盖已经确认的常见前端信号：

| 类别 | 技能 |
| --- | --- |
| language | JavaScript、TypeScript、HTML、CSS、Sass |
| css | Tailwind CSS |
| framework | Vue、Vue Router、Pinia、React、Next.js、Angular |
| engineering | Vite、Webpack、Rollup、测试、组件化 |
| performance | Web 性能优化 |
| nodejs | Node.js、Express |
| cross-platform | Electron、React Native、UniApp |
| devops | Docker、CI/CD |
| collaboration | Git、Code Review、敏捷协作 |

每个技能拥有稳定的 kebab-case ID、中文或官方展示名、有限别名和准备清单文案。别名必须明确列出；不进行拼写纠错、词干推导、相似度匹配或技术关系推断。

因此：

- `GitLab` 不自动计作 `Git`；
- `Next.js` 不自动计作 `React`；
- 未列入词典的相关词不会隐式产生技能；
- 同一别名不得属于两个不同技能。

## 匹配流程

```text
原始 JD 文本
→ 构建有限别名候选
→ 按别名长度降序、技能 ID 与别名字典序稳定排序
→ 对原始文本执行不区分大小写的精确扫描
→ 检查英文词法边界
→ 排除与既有命中重叠的区间
→ 提取局部子句与最多 80 字符展示上下文
→ 判断局部要求语气
→ 按 start、end、skillId 稳定排序
→ RawSkillMatch[]
```

### 原始位置与规范化

匹配不得改变原始文本后再复用索引。允许统一 `CRLF`/`CR` 的逻辑判断或对候选别名做大小写处理，但返回的 `start`、`end` 和 `alias` 必须始终从传入的原始字符串切片得到。不得使用会改变字符长度的 Unicode 规范化结果作为原始索引。

### 最长优先与重叠排除

别名按长度降序处理，并维护已占用的半开区间 `[start, end)`。候选区间与任一已占区间相交时丢弃。

预期结果：

- `React Native` 只产生 `react-native`；
- `Vue Router` 只产生 `vue-router`；
- `Tailwind CSS` 只产生 `tailwind-css`；
- 同一技能在不重叠位置多次出现时保留多条原始匹配，供 Task 8 计数；
- 最终结果按原文位置排序，而不是按词典顺序返回。

### 英文词法边界

包含 ASCII 字母或数字的别名，命中左右相邻字符不得是 ASCII 字母、数字或下划线。标点属于合法边界，别名内部的 `.`, `+`, `/`, `-` 按字面匹配。

这保证：

- `digital` 不匹配 `git`；
- `reactive` 不匹配 `react`；
- `GitLab` 不匹配 `Git`；
- `Node.js`、`CI/CD` 可以按完整别名匹配。

纯中文别名不强制英文词法边界，可以出现在连续中文句子中。

## 局部子句与展示上下文

语气判断和展示上下文是两个不同边界：

- 局部子句只用于 `detectTone`；
- `context` 只用于后续界面向用户展示证据。

局部子句以换行和中英文逗号、句号、分号、感叹号、问号分隔：`\n`, `\r`, `，`, `,`, `。`, `.`, `；`, `;`, `！`, `!`, `？`, `?`。匹配点所在的最小子句作为语气输入。空白会被裁剪。

展示上下文以命中为中心从原文截取，最长 80 个 UTF-16 code units，并尽量在左右分配空间；文本不足时由另一侧补足。上下文裁剪首尾空白，但不改写内部文字。

示例：

```text
熟悉 Vue，TypeScript 优先
```

Vue 的局部子句为 `熟悉 Vue`，语气为 `familiar`；TypeScript 的局部子句为 `TypeScript 优先`，语气为 `preferred`。两者的 80 字符展示上下文可以相同，但不得因此共享语气。

## 要求语气

语气优先级固定为：

```text
required > preferred > familiar > neutral
```

局部子句内同时出现多类信号时返回最高优先级。

首版信号：

- `required`：`必须`、`要求`、`熟练掌握`、`精通`、`必备`；
- `preferred`：`优先`、`加分`、`加分项`、`优先考虑`；
- `familiar`：`熟悉`、`了解`、`有经验`、`具备经验`；
- `neutral`：没有上述信号。

`detectTone` 是纯函数，只判断传入文本；`matchSkills` 负责把每个命中的局部子句传入它。同一技能多次命中的语气不在 Task 7 聚合。

## 知识库链接

`note-links.ts` 是可选的已验证深链映射，不是路由推断器。

- 只有实际打开 `https://www.kunlunmarket.work/` 下的候选页面，并确认其内容与技能对应且 URL 稳定，才可记录；
- 不得从 `E:\interview-notes` 的本地 Markdown 路径猜测线上路由；
- 没有可靠候选时导出空的只读映射，所有 `SkillDefinition.noteUrl` 均省略；
- Task 7 的正确性不依赖存在任何深链。

本次设计没有给出可靠候选 URL，因此默认实现为空映射。后续可以在单独、有证据的内容变更中增加链接。

## 错误与确定性

- 空字符串或无技能文本返回空数组，不抛错；
- 输入是 `string`，不做运行时宽类型校验；Task 8 负责整体 JD 输入状态；
- 词典在模块加载时保持静态只读，不从文件系统、网络或运行时配置发现技能；
- 所有排序都有稳定的显式次序，结果不依赖对象或文件遍历顺序；
- 词典中的重复 ID、重复别名属于代码审查和聚焦测试必须发现的配置错误，不增加生产期自动修复。

## 测试设计

聚焦测试至少覆盖：

1. Vue 3、TypeScript、Vite 和 Node.js 的常见别名；
2. `React Native`/`React`、`Vue Router`/`Vue`、`Tailwind CSS`/`CSS` 的重叠排除；
3. 同一技能多次非重叠出现，保留多个匹配并按位置排序；
4. `digital`、`reactive`、`GitLab` 的英文边界反例；
5. 原文 `alias` 与 `start`/`end` 精确对应；
6. 展示上下文不超过 80 字符；
7. 四种语气与固定优先级；
8. 同一行不同子句的 Vue=`familiar`、TypeScript=`preferred`，证明语气不串扰；
9. 空文本和无技能文本返回空数组；
10. 空知识库链接映射不会产生猜测 URL。

TDD 只运行一次预期 RED。实现后运行聚焦领域测试、`@kunlun/jd-skill-radar` typecheck、变更文件 ESLint/Prettier 和 `git diff --check`。进行一次必要 mutation：临时移除已占区间判断，要求三个长短别名重叠测试至少一个失败；恢复后只重跑聚焦领域测试。不重复全仓测试或生产构建；这些留给更高层集成任务。

## Task 8 衔接

Task 8 消费 `SKILLS`、`matchSkills` 和 `detectTone`：

- 使用 `RawSkillMatch.skillId` 关联词典；
- 使用每条非重叠匹配统计次数；
- 使用每条匹配的 `tone` 聚合单技能最高语气；
- 使用 `context` 展示原文证据；
- 使用词典类别进行评分；
- 使用词典准备文案和可选 `noteUrl` 构建去重 checklist。

Task 8 不应再次执行别名匹配、重叠消解或局部语气判断。
