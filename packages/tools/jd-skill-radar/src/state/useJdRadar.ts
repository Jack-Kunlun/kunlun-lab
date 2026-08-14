import { computed, ref, shallowRef } from "vue";
import type { DeepReadonly } from "vue";
import { copyMarkdown as copyMarkdownAdapter } from "../browser/copy-markdown.ts";
import { downloadMarkdown as downloadMarkdownAdapter } from "../browser/download-markdown.ts";
import { analyzeJd } from "../domain/analyze-jd.ts";
import { toMarkdown } from "../domain/to-markdown.ts";
import type { JdAnalysis } from "../domain/types.ts";
import type {
  JdRadarController,
  JdRadarFeedback,
  JdRadarStatus,
  UseJdRadarOptions,
} from "./types.ts";

const MARKDOWN_FILENAME = "jd-skill-radar.md";

const ANALYSIS_FAILED: JdRadarFeedback = Object.freeze({
  code: "ANALYSIS_FAILED",
  kind: "error",
  message: "分析失败，请重试",
});

const EXPORT_UNAVAILABLE: JdRadarFeedback = Object.freeze({
  code: "EXPORT_UNAVAILABLE",
  kind: "error",
  message: "暂无可导出的分析结果",
});

const COPY_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "COPY_SUCCESS",
  kind: "success",
  message: "已复制 Markdown",
});

const COPY_STALE_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "COPY_STALE_SUCCESS",
  kind: "warning",
  message: "已复制过期结果的 Markdown",
});

const COPY_FAILED: JdRadarFeedback = Object.freeze({
  code: "COPY_FAILED",
  kind: "error",
  message: "复制失败，请重试",
});

const DOWNLOAD_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_SUCCESS",
  kind: "success",
  message: "已下载 Markdown",
});

const DOWNLOAD_STALE_SUCCESS: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_STALE_SUCCESS",
  kind: "warning",
  message: "已下载过期结果的 Markdown",
});

const DOWNLOAD_FAILED: JdRadarFeedback = Object.freeze({
  code: "DOWNLOAD_FAILED",
  kind: "error",
  message: "下载失败，请重试",
});

export function useJdRadar(options: UseJdRadarOptions = {}): JdRadarController {
  const analyzePort = options.analyze ?? analyzeJd;
  const copyPort = options.copy ?? copyMarkdownAdapter;
  const downloadPort = options.download ?? downloadMarkdownAdapter;
  const input = ref("");
  const status = ref<JdRadarStatus>("idle");
  const analysis = shallowRef<JdAnalysis | null>(null);
  const checkedIds = shallowRef<ReadonlySet<string>>(new Set<string>());
  const feedback = shallowRef<JdRadarFeedback | null>(null);
  let inputVersion = 0;
  let analysisRunVersion = 0;

  function setInput(value: string): void {
    if (input.value === value) {
      return;
    }

    inputVersion += 1;
    input.value = value;
    feedback.value = null;
    status.value = analysis.value === null ? "idle" : "stale";
  }

  async function analyze(): Promise<void> {
    const analyzedInput = input.value;
    const analyzedVersion = inputVersion;
    const runVersion = analysisRunVersion + 1;

    analysisRunVersion = runVersion;

    feedback.value = null;
    status.value = "analyzing";

    try {
      const result = await analyzePort(analyzedInput);

      if (runVersion !== analysisRunVersion) {
        return;
      }

      if (analyzedVersion !== inputVersion) {
        status.value = analysis.value === null ? "idle" : "stale";

        return;
      }

      if (!result.ok) {
        analysis.value = null;
        checkedIds.value = new Set<string>();
        status.value = "invalid";
        feedback.value = { ...result.error, kind: "error" };

        return;
      }

      analysis.value = result.value;
      checkedIds.value = new Set<string>();
      status.value = "ready";
    } catch (_error: unknown) {
      if (runVersion !== analysisRunVersion) {
        return;
      }

      if (analyzedVersion !== inputVersion) {
        status.value = analysis.value === null ? "idle" : "stale";

        return;
      }

      analysis.value = null;
      checkedIds.value = new Set<string>();
      status.value = "failed";
      feedback.value = ANALYSIS_FAILED;
    }
  }

  function retry(): Promise<void> {
    return analyze();
  }

  function reset(): void {
    inputVersion += 1;
    analysisRunVersion += 1;
    input.value = "";
    status.value = "idle";
    analysis.value = null;
    checkedIds.value = new Set<string>();
    feedback.value = null;
  }

  function toggleChecklist(id: string): void {
    const currentAnalysis = analysis.value;

    feedback.value = null;

    if (!currentAnalysis?.checklist.some((item) => item.id === id)) {
      return;
    }

    const next = new Set<string>(checkedIds.value);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    checkedIds.value = next;
  }

  function getExportContext(): { analysis: JdAnalysis; stale: boolean } | undefined {
    if (analysis.value === null || (status.value !== "ready" && status.value !== "stale")) {
      feedback.value = EXPORT_UNAVAILABLE;

      return undefined;
    }

    return { analysis: analysis.value, stale: status.value === "stale" };
  }

  async function copyMarkdown(): Promise<void> {
    feedback.value = null;
    const context = getExportContext();

    if (context === undefined) {
      return;
    }

    try {
      await copyPort(toMarkdown(context.analysis, checkedIds.value));
      feedback.value = context.stale ? COPY_STALE_SUCCESS : COPY_SUCCESS;
    } catch (_error: unknown) {
      feedback.value = COPY_FAILED;
    }
  }

  async function downloadMarkdown(): Promise<void> {
    feedback.value = null;
    const context = getExportContext();

    if (context === undefined) {
      return;
    }

    try {
      await downloadPort(toMarkdown(context.analysis, checkedIds.value), MARKDOWN_FILENAME);
      feedback.value = context.stale ? DOWNLOAD_STALE_SUCCESS : DOWNLOAD_SUCCESS;
    } catch (_error: unknown) {
      feedback.value = DOWNLOAD_FAILED;
    }
  }

  function snapshot() {
    return {
      input: input.value,
      status: status.value,
      analysis: analysis.value,
      checkedIds: [...checkedIds.value],
      feedback: feedback.value,
    };
  }

  const publicInput = computed(() => input.value);
  const publicStatus = computed(() => status.value);
  const publicAnalysis = computed<DeepReadonly<JdAnalysis> | null>(() => analysis.value);
  const publicCheckedIds = computed<ReadonlySet<string>>(() => new Set(checkedIds.value));
  const publicFeedback = computed(() => feedback.value);

  return {
    input: publicInput,
    status: publicStatus,
    analysis: publicAnalysis,
    checkedIds: publicCheckedIds,
    feedback: publicFeedback,
    setInput,
    analyze,
    retry,
    toggleChecklist,
    copyMarkdown,
    downloadMarkdown,
    reset,
    snapshot,
  };
}
