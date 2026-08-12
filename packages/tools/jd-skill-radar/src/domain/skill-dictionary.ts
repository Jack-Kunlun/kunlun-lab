import { VERIFIED_NOTE_LINKS } from "./note-links.ts";
import type { SkillDefinition } from "./types.ts";

const withVerifiedNoteLink = (definition: Omit<SkillDefinition, "noteUrl">): SkillDefinition => {
  const noteUrl = VERIFIED_NOTE_LINKS[definition.id];

  return noteUrl === undefined ? definition : { ...definition, noteUrl };
};

const skillDefinitions: readonly Omit<SkillDefinition, "noteUrl">[] = [
  {
    id: "javascript",
    label: "JavaScript",
    category: "language",
    aliases: ["JavaScript", "JS"],
    checklistLabel: "复习 JavaScript 核心知识",
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "language",
    aliases: ["TypeScript", "TS"],
    checklistLabel: "复习 TypeScript 核心知识",
  },
  {
    id: "html",
    label: "HTML",
    category: "language",
    aliases: ["HTML", "HTML5"],
    checklistLabel: "复习 HTML 语义化与可访问性",
  },
  {
    id: "css",
    label: "CSS",
    category: "language",
    aliases: ["CSS", "CSS3"],
    checklistLabel: "复习 CSS 布局与响应式实践",
  },
  {
    id: "sass",
    label: "Sass",
    category: "language",
    aliases: ["Sass", "SCSS"],
    checklistLabel: "复习 Sass 样式组织方法",
  },
  {
    id: "tailwind-css",
    label: "Tailwind CSS",
    category: "css",
    aliases: ["Tailwind CSS", "TailwindCSS"],
    checklistLabel: "准备 Tailwind CSS 项目实践案例",
  },
  {
    id: "vue",
    label: "Vue",
    category: "framework",
    aliases: ["Vue", "Vue.js", "Vue 3", "Vue3"],
    checklistLabel: "准备 Vue 项目实践案例",
  },
  {
    id: "vue-router",
    label: "Vue Router",
    category: "framework",
    aliases: ["Vue Router", "VueRouter"],
    checklistLabel: "复习 Vue Router 路由实践",
  },
  {
    id: "pinia",
    label: "Pinia",
    category: "framework",
    aliases: ["Pinia"],
    checklistLabel: "复习 Pinia 状态管理实践",
  },
  {
    id: "react",
    label: "React",
    category: "framework",
    aliases: ["React", "React.js"],
    checklistLabel: "准备 React 项目实践案例",
  },
  {
    id: "nextjs",
    label: "Next.js",
    category: "framework",
    aliases: ["Next.js", "NextJS"],
    checklistLabel: "复习 Next.js 应用开发实践",
  },
  {
    id: "angular",
    label: "Angular",
    category: "framework",
    aliases: ["Angular"],
    checklistLabel: "复习 Angular 项目实践",
  },
  {
    id: "vite",
    label: "Vite",
    category: "engineering",
    aliases: ["Vite"],
    checklistLabel: "复习 Vite 构建配置与插件",
  },
  {
    id: "webpack",
    label: "Webpack",
    category: "engineering",
    aliases: ["Webpack"],
    checklistLabel: "复习 Webpack 构建配置",
  },
  {
    id: "rollup",
    label: "Rollup",
    category: "engineering",
    aliases: ["Rollup"],
    checklistLabel: "复习 Rollup 打包配置",
  },
  {
    id: "testing",
    label: "测试",
    category: "engineering",
    aliases: ["单元测试", "自动化测试", "E2E", "Vitest", "Jest", "Cypress", "Playwright"],
    checklistLabel: "准备前端测试实践案例",
  },
  {
    id: "componentization",
    label: "组件化",
    category: "engineering",
    aliases: ["组件化", "组件设计"],
    checklistLabel: "准备组件化设计实践案例",
  },
  {
    id: "performance",
    label: "Web 性能优化",
    category: "performance",
    aliases: ["性能优化", "Web 性能", "前端性能"],
    checklistLabel: "准备 Web 性能优化实践案例",
  },
  {
    id: "nodejs",
    label: "Node.js",
    category: "nodejs",
    aliases: ["Node.js", "NodeJS"],
    checklistLabel: "复习 Node.js 服务开发基础",
  },
  {
    id: "express",
    label: "Express",
    category: "nodejs",
    aliases: ["Express", "Express.js"],
    checklistLabel: "准备 Express 服务开发实践",
  },
  {
    id: "electron",
    label: "Electron",
    category: "cross-platform",
    aliases: ["Electron"],
    checklistLabel: "复习 Electron 跨端开发实践",
  },
  {
    id: "react-native",
    label: "React Native",
    category: "cross-platform",
    aliases: ["React Native", "ReactNative"],
    checklistLabel: "复习 React Native 跨端开发实践",
  },
  {
    id: "uniapp",
    label: "UniApp",
    category: "cross-platform",
    aliases: ["UniApp", "uni-app"],
    checklistLabel: "复习 UniApp 跨端开发实践",
  },
  {
    id: "docker",
    label: "Docker",
    category: "devops",
    aliases: ["Docker"],
    checklistLabel: "复习 Docker 容器化部署实践",
  },
  {
    id: "ci-cd",
    label: "CI/CD",
    category: "devops",
    aliases: ["CI/CD", "持续集成", "持续交付"],
    checklistLabel: "复习 CI/CD 流程与自动化部署",
  },
  {
    id: "git",
    label: "Git",
    category: "collaboration",
    aliases: ["Git"],
    checklistLabel: "复习 Git 分支与协作流程",
  },
  {
    id: "code-review",
    label: "Code Review",
    category: "collaboration",
    aliases: ["Code Review", "代码评审", "代码审查"],
    checklistLabel: "准备 Code Review 协作实践案例",
  },
  {
    id: "agile-collaboration",
    label: "敏捷协作",
    category: "collaboration",
    aliases: ["敏捷开发", "敏捷协作", "Scrum"],
    checklistLabel: "准备敏捷协作实践案例",
  },
];

export const SKILLS: readonly SkillDefinition[] = skillDefinitions.map(withVerifiedNoteLink);
