import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { createPublicToolRegistry } from "@kunlun/tool-kit/registry";
import { defineNuxtPlugin } from "#imports";

export default defineNuxtPlugin(() => {
  const toolRegistry = createPublicToolRegistry([jdSkillRadarManifest]);

  return {
    provide: {
      toolRegistry,
    },
  };
});
