// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import JdOverview from "./JdOverview.vue";
import KeywordDetails from "./KeywordDetails.vue";
import PreparationChecklist from "./PreparationChecklist.vue";
import SkillDistribution from "./SkillDistribution.vue";

describe("JD analysis result components", () => {
  it("renders unknown overview fields without inference", () => {
    const wrapper = mount(JdOverview, {
      props: {
        overview: {
          role: "前端工程师",
          experience: "",
          education: "",
          location: "杭州 / 混合办公",
          primaryFrameworks: [],
        },
      },
    });

    expect(wrapper.text()).toContain("前端工程师");
    expect(wrapper.text().match(/未识别/g)).toHaveLength(3);
  });

  it("pairs every category score with native meter and textual values", () => {
    const wrapper = mount(SkillDistribution, {
      props: {
        categories: [
          { category: "language", matchCount: 3, score: 88 },
          { category: "framework", matchCount: 2, score: 64 },
        ],
      },
    });

    expect(wrapper.findAll("meter")).toHaveLength(2);
    expect(wrapper.findAll("meter").map((meter) => meter.attributes("value"))).toEqual([
      "88",
      "64",
    ]);
    expect(wrapper.text()).toContain("语言");
    expect(wrapper.text()).toContain("88 / 100");
    expect(wrapper.text()).toContain("3 次命中");
  });

  it("keeps keyword order and renders every full context", () => {
    const contexts = [
      "要求熟练掌握 TypeScript，并能在大型工程中设计稳定的类型边界。",
      "具备 TypeScript 工程实践经验，能够维护严格的类型检查。",
    ];
    const wrapper = mount(KeywordDetails, {
      props: {
        keywords: [
          {
            category: "language",
            contexts,
            count: 2,
            label: "TypeScript",
            skillId: "typescript",
            tone: "required",
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("TypeScript");
    expect(wrapper.text()).toContain("2 次");
    expect(wrapper.text()).toContain("必须");
    contexts.forEach((context) => {
      expect(wrapper.text()).toContain(context);
    });
  });

  it("uses native checklist controls and only renders verified links", async () => {
    const wrapper = mount(PreparationChecklist, {
      props: {
        checkedIds: new Set<string>(["prepare:typescript"]),
        items: [
          {
            id: "prepare:typescript",
            label: "复习 TypeScript 核心知识",
            noteUrl: "https://www.kunlunmarket.work/typescript",
          },
          { id: "prepare:vue", label: "准备 Vue 项目实践案例" },
        ],
      },
    });

    const checkboxes = wrapper.findAll("input[type=checkbox]");
    const typescriptCheckbox = checkboxes[0];
    const vueCheckbox = checkboxes[1];

    expect(checkboxes).toHaveLength(2);
    expect(typescriptCheckbox).toBeDefined();
    expect(vueCheckbox).toBeDefined();
    expect(wrapper.findAll("a")).toHaveLength(1);

    if (typescriptCheckbox === undefined || vueCheckbox === undefined) {
      throw new Error("Expected two checklist controls.");
    }

    expect(typescriptCheckbox.attributes("checked")).toBeDefined();
    await vueCheckbox.setValue(true);
    await wrapper.get("[data-action=copy]").trigger("click");
    await wrapper.get("[data-action=download]").trigger("click");

    expect(wrapper.emitted("toggle")?.[0]).toEqual(["prepare:vue"]);
    expect(wrapper.emitted("copy")).toHaveLength(1);
    expect(wrapper.emitted("download")).toHaveLength(1);
  });
});
