// @vitest-environment happy-dom

import { createToolRegistry } from "@kunlun/tool-kit/registry";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { jdSkillRadarManifest } from "./manifest.ts";

describe("jdSkillRadarManifest", () => {
  it("registers one truthful alpha identity with local export capabilities", () => {
    const registry = createToolRegistry([jdSkillRadarManifest]);

    expect(registry.get("jd-skill-radar")).toMatchObject({
      capabilities: ["clipboard", "download"],
      id: "jd-skill-radar",
      runtime: "client",
      status: "alpha",
      title: "前端岗位 JD 技能雷达",
    });
  });

  it("lazily loads the interactive workbench", async () => {
    const loadedComponent = await jdSkillRadarManifest.component();
    const wrapper = mount(loadedComponent.default);

    expect(wrapper.get("textarea").attributes("aria-describedby")).toBeDefined();
    expect(wrapper.text()).toContain("开始分析");
    expect(wrapper.text()).not.toContain("工具仍在建设中");
  });
});
