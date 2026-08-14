// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { AnalyzeJdResult, JdAnalysis } from "../domain/types.ts";
import JdSkillRadar from "./JdSkillRadar.vue";

const validInput = "TypeScript、Vue、工程化、性能优化与团队协作岗位要求。".repeat(4);
const analysis: JdAnalysis = {
  overview: {
    role: "前端工程师",
    experience: "3-5 年",
    education: "本科",
    location: "杭州 / 混合办公",
    primaryFrameworks: ["Vue"],
  },
  categories: [{ category: "language", matchCount: 2, score: 100 }],
  keywords: [
    {
      category: "language",
      contexts: ["必须熟练掌握 TypeScript"],
      count: 2,
      label: "TypeScript",
      skillId: "typescript",
      tone: "required",
    },
  ],
  checklist: [{ id: "prepare:typescript", label: "复习 TypeScript 核心知识" }],
  meta: { categoryCount: 1, characterCount: validInput.length, skillCount: 1 },
};
const success: AnalyzeJdResult = { ok: true, value: analysis };

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}

function uninitializedResolver<T>(_value: T | PromiseLike<T>): void {
  throw new Error("Deferred resolver was not initialized");
}

function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>["resolve"] = uninitializedResolver;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("JdSkillRadar", () => {
  it("starts idle with one labeled input and no results", () => {
    const wrapper = mount(JdSkillRadar);

    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
    expect(wrapper.findAll("h1")).toHaveLength(1);
  });

  it("shows analyzing and then all ready modules", async () => {
    const deferred = createDeferred<AnalyzeJdResult>();
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => deferred.promise } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("正在分析");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);

    deferred.resolve(success);
    await flushPromises();

    expect(wrapper.get("[data-results=true]").text()).toContain("岗位概览");
    expect(wrapper.get("[data-results=true]").text()).toContain("技能分布");
    expect(wrapper.get("[data-results=true]").text()).toContain("关键词明细");
    expect(wrapper.get("[data-results=true]").text()).toContain("准备清单");
  });

  it("retains results and announces stale after input changes", async () => {
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => success } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();
    await wrapper.get("textarea").setValue(`${validInput}\n新修改`);

    expect(wrapper.get("[data-status=stale]").text()).toContain("输入已修改，当前结果已过期");
    expect(wrapper.find("[data-results=true]").exists()).toBe(true);
  });

  it("hides unexpected failures and retries the latest input", async () => {
    const analyze = vi
      .fn<(text: string) => AnalyzeJdResult | Promise<AnalyzeJdResult>>()
      .mockRejectedValueOnce(new Error("internal marker"))
      .mockReturnValueOnce(success);
    const wrapper = mount(JdSkillRadar, { props: { options: { analyze } } });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("分析失败，请重试");
    expect(wrapper.text()).not.toContain("internal marker");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);

    await wrapper.get("[data-action=retry]").trigger("click");
    await flushPromises();

    expect(analyze).toHaveBeenLastCalledWith(validInput);
    expect(wrapper.find("[data-results=true]").exists()).toBe(true);
  });

  it("explains no-skills input without retaining results", async () => {
    const noSkills: AnalyzeJdResult = {
      ok: false,
      error: { code: "NO_SKILLS", message: "没有识别到当前词典支持的前端技能。" },
    };
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => noSkills } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
  });

  it("connects checklist and export actions and reset returns idle", async () => {
    const copy = vi.fn<(markdown: string) => Promise<void>>().mockResolvedValue();
    const download = vi.fn<(markdown: string, filename: string) => void>();
    const wrapper = mount(JdSkillRadar, {
      props: { options: { analyze: () => success, copy, download } },
    });

    await wrapper.get("textarea").setValue(validInput);
    await wrapper.get("[data-action=analyze]").trigger("click");
    await flushPromises();
    await wrapper.get("input[type=checkbox]").setValue(true);
    await wrapper.get("[data-action=copy]").trigger("click");
    await wrapper.get("[data-action=download]").trigger("click");
    await flushPromises();

    expect(copy).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();

    await wrapper.get("[data-action=reset]").trigger("click");

    expect(wrapper.get("textarea").element).toHaveProperty("value", "");
    expect(wrapper.find("[data-results=true]").exists()).toBe(false);
  });
});
