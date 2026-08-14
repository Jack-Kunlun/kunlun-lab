import { describe, expect, it, vi } from "vitest";
import type { AnalyzeJdResult, JdAnalysis } from "../domain/types.ts";
import { useJdRadar } from "./useJdRadar.ts";

const validJd = "TypeScript 与 Vue 工程实践，负责前端工程化、性能优化和团队协作。".repeat(3);

const analysis: JdAnalysis = {
  overview: {
    role: "前端工程师",
    experience: "未识别",
    education: "未识别",
    location: "未识别",
    primaryFrameworks: ["Vue"],
  },
  categories: [{ category: "language", score: 100, matchCount: 1 }],
  keywords: [
    {
      skillId: "typescript",
      label: "TypeScript",
      category: "language",
      count: 1,
      tone: "required",
      contexts: [],
    },
  ],
  checklist: [{ id: "prepare:typescript", label: "复习 TypeScript 核心知识" }],
  meta: { characterCount: validJd.length, skillCount: 1, categoryCount: 1 },
};

const successResult: AnalyzeJdResult = { ok: true, value: analysis };

describe("useJdRadar exports", () => {
  it("copies ready output and reports success", async () => {
    const copy = vi.fn<(markdown: string) => Promise<void>>().mockResolvedValue();
    const radar = useJdRadar({ analyze: () => successResult, copy });

    radar.setInput(validJd);
    await radar.analyze();
    await radar.copyMarkdown();

    expect(copy).toHaveBeenCalledOnce();
    expect(copy.mock.calls[0]?.[0]).toContain("# 前端岗位 JD 技能雷达");
    expect(radar.feedback.value).toEqual({
      code: "COPY_SUCCESS",
      kind: "success",
      message: "已复制 Markdown",
    });
  });

  it("exports the retained analysis from stale state with a warning", async () => {
    const download = vi.fn<(markdown: string, filename: string) => void>();
    const radar = useJdRadar({ analyze: () => successResult, download });

    radar.setInput(validJd);
    await radar.analyze();
    radar.setInput(`${validJd}\n尚未分析的新内容`);
    await radar.downloadMarkdown();

    expect(download.mock.calls[0]?.[1]).toBe("jd-skill-radar.md");
    expect(download.mock.calls[0]?.[0]).not.toContain("尚未分析的新内容");
    expect(radar.status.value).toBe("stale");
    expect(radar.feedback.value).toEqual({
      code: "DOWNLOAD_STALE_SUCCESS",
      kind: "warning",
      message: "已下载过期结果的 Markdown",
    });
  });

  it("keeps ready state when copy fails", async () => {
    const copy = vi
      .fn<(markdown: string) => Promise<void>>()
      .mockRejectedValue(new Error("marker"));
    const radar = useJdRadar({ analyze: () => successResult, copy });

    radar.setInput(validJd);
    await radar.analyze();
    await radar.copyMarkdown();

    expect(radar.status.value).toBe("ready");
    expect(radar.analysis.value).toEqual(analysis);
    expect(radar.feedback.value).toEqual({
      code: "COPY_FAILED",
      kind: "error",
      message: "复制失败，请重试",
    });
  });

  it("reports unavailable export without calling adapters", async () => {
    const copy = vi.fn<(markdown: string) => Promise<void>>();
    const radar = useJdRadar({ copy });

    await radar.copyMarkdown();

    expect(copy).not.toHaveBeenCalled();
    expect(radar.feedback.value).toEqual({
      code: "EXPORT_UNAVAILABLE",
      kind: "error",
      message: "暂无可导出的分析结果",
    });
  });

  it("keeps stale state and analysis when download fails", async () => {
    const download = vi
      .fn<(markdown: string, filename: string) => void>()
      .mockImplementation(() => {
        throw new Error("marker");
      });
    const radar = useJdRadar({ analyze: () => successResult, download });

    radar.setInput(validJd);
    await radar.analyze();
    radar.setInput(`${validJd}\n未分析变更`);
    await radar.downloadMarkdown();

    expect(radar.status.value).toBe("stale");
    expect(radar.analysis.value).toEqual(analysis);
    expect(radar.feedback.value).toEqual({
      code: "DOWNLOAD_FAILED",
      kind: "error",
      message: "下载失败，请重试",
    });
  });
});
