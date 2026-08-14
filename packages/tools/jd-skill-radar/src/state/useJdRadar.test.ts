import { describe, expect, it, vi } from "vitest";
import type { AnalyzeJdResult, JdAnalysis, JdInputErrorCode } from "../domain/types.ts";
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

function errorResult(code: JdInputErrorCode, message: string): AnalyzeJdResult {
  return { ok: false, error: { code, message } };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("useJdRadar lifecycle", () => {
  it("exposes analyzing before a synchronous success becomes ready", async () => {
    const radar = useJdRadar({ analyze: () => successResult });

    radar.setInput(validJd);
    const pending = radar.analyze();

    expect(radar.status.value).toBe("analyzing");

    await pending;

    expect(radar.status.value).toBe("ready");
    expect(radar.analysis.value).toEqual(analysis);
  });

  it("keeps the prior result and checked IDs when input becomes stale", async () => {
    const radar = useJdRadar({ analyze: () => successResult });

    radar.setInput(validJd);
    await radar.analyze();
    radar.toggleChecklist("prepare:typescript");
    radar.setInput(`${validJd}\n新增要求：熟悉 Docker`);

    expect(radar.status.value).toBe("stale");
    expect(radar.analysis.value).toEqual(analysis);
    expect([...radar.checkedIds.value]).toEqual(["prepare:typescript"]);
  });

  it.each([
    ["EMPTY", "请粘贴一份前端岗位 JD。"],
    ["TOO_SHORT", "JD 内容过短，请提供更完整的岗位描述。"],
    ["TOO_LONG", "JD 内容超过 20,000 个字符，请缩短后重试。"],
    ["NO_SKILLS", "没有识别到当前词典支持的前端技能。"],
  ] as const)("clears stale output for %s", async (code, message) => {
    const analyze = vi
      .fn<(text: string) => AnalyzeJdResult>()
      .mockReturnValueOnce(successResult)
      .mockReturnValueOnce(errorResult(code, message));
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    await radar.analyze();
    radar.toggleChecklist("prepare:typescript");
    radar.setInput("bad input");
    await radar.analyze();

    expect(radar.snapshot()).toEqual({
      input: "bad input",
      status: "invalid",
      analysis: null,
      checkedIds: [],
      feedback: { code, kind: "error", message },
    });
  });

  it("uses the latest input for retry after an unexpected failure", async () => {
    const analyze = vi
      .fn<(text: string) => AnalyzeJdResult>()
      .mockImplementationOnce(() => {
        throw new Error("internal marker");
      })
      .mockReturnValueOnce(successResult);
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    await radar.analyze();

    expect(radar.status.value).toBe("failed");
    expect(radar.feedback.value).toEqual({
      code: "ANALYSIS_FAILED",
      kind: "error",
      message: "分析失败，请重试",
    });

    radar.setInput(`${validJd}\n最新输入`);
    await radar.retry();

    expect(analyze).toHaveBeenLastCalledWith(`${validJd}\n最新输入`);
    expect(radar.status.value).toBe("ready");
  });

  it("reset removes input, result, checked state, and feedback", async () => {
    const radar = useJdRadar({ analyze: () => successResult });

    radar.setInput(validJd);
    await radar.analyze();
    radar.toggleChecklist("prepare:typescript");
    radar.reset();

    expect(radar.snapshot()).toEqual({
      input: "",
      status: "idle",
      analysis: null,
      checkedIds: [],
      feedback: null,
    });
  });

  it("keeps idle state when a deferred analysis resolves after reset", async () => {
    const deferred = createDeferred<AnalyzeJdResult>();
    const analyze = vi
      .fn<(text: string) => Promise<AnalyzeJdResult>>()
      .mockReturnValue(deferred.promise);
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    const pending = radar.analyze();

    radar.reset();
    deferred.resolve(successResult);
    await pending;

    expect(radar.snapshot()).toEqual({
      input: "",
      status: "idle",
      analysis: null,
      checkedIds: [],
      feedback: null,
    });
  });

  it("keeps idle state when a deferred analysis rejects after reset", async () => {
    const deferred = createDeferred<AnalyzeJdResult>();
    const analyze = vi
      .fn<(text: string) => Promise<AnalyzeJdResult>>()
      .mockReturnValue(deferred.promise);
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    const pending = radar.analyze();

    radar.reset();
    deferred.reject(new Error("obsolete marker"));
    await pending;

    expect(radar.snapshot()).toEqual({
      input: "",
      status: "idle",
      analysis: null,
      checkedIds: [],
      feedback: null,
    });
  });

  it("ignores an analysis result when input changes before it settles", async () => {
    const analyze = vi
      .fn<(text: string) => Promise<AnalyzeJdResult>>()
      .mockResolvedValue(successResult);
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    const pending = radar.analyze();

    radar.setInput(`${validJd}\n已修改`);
    await pending;

    expect(radar.status.value).toBe("idle");
    expect(radar.analysis.value).toBeNull();
  });

  it("ignores an older run when the same input is analyzed twice", async () => {
    const first = createDeferred<AnalyzeJdResult>();
    const second = createDeferred<AnalyzeJdResult>();
    const analyze = vi
      .fn<(text: string) => Promise<AnalyzeJdResult>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const radar = useJdRadar({ analyze });

    radar.setInput(validJd);
    const firstPending = radar.analyze();
    const secondPending = radar.analyze();

    second.resolve(successResult);
    await secondPending;
    first.reject(new Error("obsolete marker"));
    await firstPending;

    expect(radar.status.value).toBe("ready");
    expect(radar.analysis.value).toEqual(analysis);
    expect(radar.feedback.value).toBeNull();
  });

  it("toggles only checklist IDs in the current analysis", async () => {
    const radar = useJdRadar({ analyze: () => successResult });

    radar.setInput(validJd);
    await radar.analyze();
    radar.toggleChecklist("missing");
    radar.toggleChecklist("prepare:typescript");

    expect([...radar.checkedIds.value]).toEqual(["prepare:typescript"]);

    radar.toggleChecklist("prepare:typescript");

    expect([...radar.checkedIds.value]).toEqual([]);
  });

  it("clears checked IDs after every successful reanalysis", async () => {
    const radar = useJdRadar({ analyze: () => successResult });

    radar.setInput(validJd);
    await radar.analyze();
    radar.toggleChecklist("prepare:typescript");
    await radar.analyze();

    expect(radar.status.value).toBe("ready");
    expect([...radar.checkedIds.value]).toEqual([]);
  });
});
