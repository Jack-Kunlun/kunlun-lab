import type { ToolManifest } from "@kunlun/shared";

export const jdSkillRadarManifest: ToolManifest = {
  capabilities: ["clipboard", "download"],
  component: () => import("./components/JdSkillRadar.vue"),
  id: "jd-skill-radar",
  runtime: "client",
  status: "alpha",
  title: "前端岗位 JD 技能雷达",
} satisfies ToolManifest;
