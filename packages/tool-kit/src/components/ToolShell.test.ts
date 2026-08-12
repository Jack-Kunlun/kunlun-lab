// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ToolShell from "./ToolShell.vue";

describe("ToolShell", () => {
  it("renders ready content inside the stable tool viewport", () => {
    const wrapper = mount(ToolShell, {
      props: { state: "ready" },
      slots: { default: "工具已就绪" },
    });

    expect(wrapper.find("[data-tool-shell]").exists()).toBe(true);
    expect(wrapper.get("[data-tool-viewport]").text()).toContain("工具已就绪");
  });

  it("renders default and custom loading content as polite status", () => {
    const defaultWrapper = mount(ToolShell, { props: { state: "loading" } });
    const customWrapper = mount(ToolShell, {
      props: { state: "loading" },
      slots: { loading: "正在准备本地工具" },
    });

    expect(defaultWrapper.get("[role=status]").text()).toContain("工具正在加载");
    expect(defaultWrapper.get("[role=status]").attributes("aria-live")).toBe("polite");
    expect(customWrapper.get("[role=status]").text()).toContain("正在准备本地工具");
  });

  it("shows safe error copy and retry without internal exception details", async () => {
    const wrapper = mount(ToolShell, {
      props: { state: "error", error: new Error("internal stack marker") },
    });

    expect(wrapper.get("[role=alert]").text()).toContain("工具暂时无法运行");
    expect(wrapper.text()).not.toContain("internal stack marker");
    await wrapper.get("[data-test=retry]").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("renders feedback through a polite live region", () => {
    const wrapper = mount(ToolShell, {
      props: { feedback: "Markdown 已复制", state: "feedback" },
    });

    expect(wrapper.get("[role=status]").text()).toContain("Markdown 已复制");
    expect(wrapper.get("[role=status]").attributes("aria-live")).toBe("polite");
  });

  it("replaces only viewport content when state changes", async () => {
    const wrapper = mount(ToolShell, {
      props: { state: "ready" },
      slots: { default: "分析工作台" },
    });
    const shellElement = wrapper.get("[data-tool-shell]").element;

    await wrapper.setProps({ state: "error", error: new Error("hidden") });

    expect(wrapper.get("[data-tool-shell]").element).toBe(shellElement);
    expect(wrapper.get("[data-tool-viewport]").text()).not.toContain("分析工作台");
    expect(wrapper.text()).not.toContain("hidden");
  });

  it("renders custom error content without exposing the exception", () => {
    let receivedSlotProps: Record<string, never> | undefined;
    const wrapper = mount(ToolShell, {
      props: { state: "error", error: new Error("private details") },
      slots: {
        error: (slotProps: Record<string, never>) => {
          receivedSlotProps = slotProps;

          return "自定义安全错误状态";
        },
      },
    });

    expect(receivedSlotProps).toEqual({});
    expect(wrapper.get("[role=alert]").text()).toContain("自定义安全错误状态");
    expect(wrapper.text()).not.toContain("private details");
  });

  it("renders custom feedback content through the status region", () => {
    const wrapper = mount(ToolShell, {
      props: { feedback: "无需显示", state: "feedback" },
      slots: { feedback: "自定义反馈状态" },
    });

    expect(wrapper.get("[role=status]").text()).toContain("自定义反馈状态");
  });
});
