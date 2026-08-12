// @vitest-environment happy-dom

import { createToolRegistry } from "@kunlun/tool-kit/registry";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { jdSkillRadarManifest } from "./manifest.ts";

describe("jdSkillRadarManifest", () => {
  it("registers one truthful draft identity with no unavailable capabilities", () => {
    const registry = createToolRegistry([jdSkillRadarManifest]);

    expect(registry.get("jd-skill-radar")).toMatchObject({
      capabilities: [],
      id: "jd-skill-radar",
      runtime: "client",
      status: "draft",
      title: "前端岗位 JD 技能雷达",
    });
  });

  it("loads a non-interactive construction notice instead of claiming analysis is ready", async () => {
    const loadedComponent = await jdSkillRadarManifest.component();
    const wrapper = mount(loadedComponent.default);

    expect(wrapper.text()).toContain("工具仍在建设中");
    expect(wrapper.text()).not.toContain("开始分析");
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find("textarea").exists()).toBe(false);
  });
});
