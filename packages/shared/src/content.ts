import type { Component } from "vue";

export type WorkType = "project" | "tool" | "experiment";

export type PublishStatus = "draft" | "alpha" | "beta" | "maintained" | "archived";

export type ToolCapability = "clipboard" | "download";
export type ToolRuntime = "client";

export interface ToolManifest {
  id: string;
  title: string;
  runtime: ToolRuntime;
  status: Exclude<PublishStatus, "archived">;
  capabilities: readonly ToolCapability[];
  component: () => Promise<{ default: Component }>;
}

export interface WorkMeta {
  title: string;
  description: string;
  type: WorkType;
  status: PublishStatus;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  appUrl?: string;
  sourceUrl?: string;
  caseStudyUrl?: string;
  toolId?: string;
}
