import type { ToolManifest } from "@kunlun/shared";

export const jdSkillRadarManifest: ToolManifest = {
  capabilities: [],
  component: () => import("./components/JdSkillRadarDraft.vue"),
  id: "jd-skill-radar",
  runtime: "client",
  status: "draft",
  title: "前端岗位 JD 技能雷达",
} satisfies ToolManifest;
