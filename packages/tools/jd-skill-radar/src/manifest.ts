import type { ToolManifest } from "@kunlun/shared";

export const jdSkillRadarManifest: ToolManifest = {
  capabilities: ["clipboard", "download"],
  component: () => import("./components/JdSkillRadar.vue"),
  description: "在浏览器本地把一份前端招聘 JD 整理为可核对的技能信号与准备清单。",
  id: "jd-skill-radar",
  runtime: "client",
  status: "alpha",
  title: "前端岗位 JD 技能雷达",
} satisfies ToolManifest;
