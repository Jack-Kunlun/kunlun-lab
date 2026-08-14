// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import JdInputPanel from "./JdInputPanel.vue";

describe("JdInputPanel", () => {
  it("emits input and primary actions from native controls", async () => {
    const wrapper = mount(JdInputPanel, {
      props: { feedback: null, input: "", status: "idle" },
    });

    await wrapper.get("textarea").setValue("TypeScript 与 Vue 岗位描述");
    await wrapper.get("[data-action=analyze]").trigger("click");

    expect(wrapper.emitted("update:input")?.[0]).toEqual(["TypeScript 与 Vue 岗位描述"]);
    expect(wrapper.emitted("analyze")).toHaveLength(1);
    expect(wrapper.text()).toContain("JD 不上传、不记录");
  });

  it("disables duplicate analysis while analyzing", () => {
    const wrapper = mount(JdInputPanel, {
      props: { feedback: null, input: "分析中的文本", status: "analyzing" },
    });

    expect(wrapper.get("[data-action=analyze]").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("正在分析");
  });

  it("renders the no-skills explanation in one polite live region", () => {
    const wrapper = mount(JdInputPanel, {
      props: {
        feedback: {
          code: "NO_SKILLS",
          kind: "error",
          message: "没有识别到当前词典支持的前端技能。",
        },
        input: "行政支持内容",
        status: "invalid",
      },
    });

    const feedback = wrapper.get("[aria-live=polite]");

    expect(feedback.text()).toBe("未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。");
    expect(wrapper.get("textarea").attributes("aria-invalid")).toBe("true");
    expect(wrapper.findAll("[aria-live=polite]")).toHaveLength(1);
  });

  it("offers retry only for failed analysis and emits reset", async () => {
    const wrapper = mount(JdInputPanel, {
      props: {
        feedback: { code: "ANALYSIS_FAILED", kind: "error", message: "分析失败，请重试" },
        input: "保留的输入",
        status: "failed",
      },
    });

    await wrapper.get("[data-action=retry]").trigger("click");
    await wrapper.get("[data-action=reset]").trigger("click");

    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.emitted("reset")).toHaveLength(1);
  });
});
