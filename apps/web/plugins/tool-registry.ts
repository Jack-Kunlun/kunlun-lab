import { jdSkillRadarManifest } from "@kunlun/jd-skill-radar";
import { createToolRegistry } from "@kunlun/tool-kit/registry";
import { defineNuxtPlugin } from "#imports";

export default defineNuxtPlugin(() => {
  const toolRegistry = createToolRegistry([jdSkillRadarManifest]);

  return {
    provide: {
      toolRegistry,
    },
  };
});
