import type { ToolManifest } from "@kunlun/shared";
import { useNuxtApp } from "#imports";

export function useToolRegistry(): ReadonlyMap<string, ToolManifest> {
  return useNuxtApp().$toolRegistry;
}
