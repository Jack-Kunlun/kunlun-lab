import type { ComputedRef, DeepReadonly } from "vue";
import type { AnalyzeJdResult, JdAnalysis, JdInputErrorCode } from "../domain/types.ts";

export type JdRadarStatus = "idle" | "analyzing" | "ready" | "stale" | "invalid" | "failed";

export type JdRadarFeedbackCode =
  | JdInputErrorCode
  | "ANALYSIS_FAILED"
  | "EXPORT_UNAVAILABLE"
  | "COPY_SUCCESS"
  | "COPY_STALE_SUCCESS"
  | "COPY_FAILED"
  | "DOWNLOAD_SUCCESS"
  | "DOWNLOAD_STALE_SUCCESS"
  | "DOWNLOAD_FAILED";

export type JdRadarFeedbackKind = "success" | "warning" | "error";

export interface JdRadarFeedback {
  code: JdRadarFeedbackCode;
  kind: JdRadarFeedbackKind;
  message: string;
}

export interface JdRadarDependencies {
  analyze: (text: string) => AnalyzeJdResult | Promise<AnalyzeJdResult>;
  copy: (markdown: string) => Promise<void>;
  download: (markdown: string, filename: string) => void | Promise<void>;
}

export type UseJdRadarOptions = Partial<JdRadarDependencies>;

export interface JdRadarSnapshot {
  input: string;
  status: JdRadarStatus;
  analysis: JdAnalysis | null;
  checkedIds: string[];
  feedback: JdRadarFeedback | null;
}

export interface JdRadarController {
  input: ComputedRef<string>;
  status: ComputedRef<JdRadarStatus>;
  analysis: ComputedRef<DeepReadonly<JdAnalysis> | null>;
  checkedIds: ComputedRef<ReadonlySet<string>>;
  feedback: ComputedRef<JdRadarFeedback | null>;
  setInput: (value: string) => void;
  analyze: () => Promise<void>;
  retry: () => Promise<void>;
  toggleChecklist: (id: string) => void;
  copyMarkdown: () => Promise<void>;
  downloadMarkdown: () => Promise<void>;
  reset: () => void;
  snapshot: () => JdRadarSnapshot;
}
