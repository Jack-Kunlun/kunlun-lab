// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import LabButton from "./LabButton.vue";
import LabPanel from "./LabPanel.vue";
import MetricCell from "./MetricCell.vue";
import StatusBadge from "./StatusBadge.vue";

describe("B1 UI primitives", () => {
  test("renders status with visible text and a machine-readable tone", () => {
    const badge = mount(StatusBadge, {
      props: { tone: "online", label: "持续维护" },
    });

    expect(badge.text()).toContain("持续维护");
    expect(badge.attributes("data-tone")).toBe("online");
  });

  test("uses native button semantics and a safe default type", () => {
    const button = mount(LabButton, {
      slots: { default: "分析 JD" },
    });

    expect(button.get("button").attributes("type")).toBe("button");
    expect(button.text()).toContain("分析 JD");
  });

  test("renders panel content inside a section element", () => {
    const panel = mount(LabPanel, {
      slots: { default: "本地分析，不上传 JD" },
    });

    expect(panel.get("section").text()).toContain("本地分析，不上传 JD");
  });

  test("associates a metric label with its visible value", () => {
    const metric = mount(MetricCell, {
      props: { label: "已发布作品", value: 3 },
    });

    expect(metric.get("dt").text()).toBe("已发布作品");
    expect(metric.get("dd").text()).toBe("3");
  });
});
