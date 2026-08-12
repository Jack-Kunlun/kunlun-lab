import type { ToolCapability, ToolManifest, ToolRuntime } from "@kunlun/shared";

export const supportedToolCapabilities = new Set<string>(["clipboard", "download"]);
export const supportedToolRuntimes = new Set<string>(["client"]);
export const supportedToolStatuses = new Set<string>(["draft", "alpha", "beta", "maintained"]);
export const toolIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ToolShellState = "ready" | "loading" | "error" | "feedback";

export type { ToolCapability, ToolManifest, ToolRuntime };
