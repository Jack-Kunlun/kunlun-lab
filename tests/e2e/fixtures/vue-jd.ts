/**
 * 确定性的 JD 测试输入，供 E2E 复用。
 *
 * 这些字符串只提供稳定输入，不替换真实 controller、组件或算法；
 * 分析仍走浏览器本地完整的 analyzeJd 流水线。
 */
export const VUE_JD = `职位：高级前端开发工程师
工作地点：杭州
支持混合办公
本科及以上学历，3-5 年前端开发经验。
岗位要求：必须熟练掌握 TypeScript，必须具备 TypeScript 工程实践。
必须熟练掌握 Vue 3，熟悉 Vue Router，了解 Pinia。
熟悉 CSS、Sass 和 Tailwind CSS，具备 Vite 与自动化测试经验。
Node.js 经验优先，熟悉 Git 与 Code Review 协作流程。`;

/** 过短输入，用于触发 TOO_SHORT。 */
export const SHORT_JD = "Vue 前端";

/** 长度达标但没有任何词典技能，用于触发 NO_SKILLS。 */
export const NO_SKILLS_JD = "负责客户沟通、合同归档与行政支持。".repeat(8);

/** 超过 20,000 字符上限，用于触发 TOO_LONG。 */
export const TOO_LONG_JD = "x".repeat(20_001);
