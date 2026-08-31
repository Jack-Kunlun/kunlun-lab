import type { PublicToolManifest } from "@kunlun/tool-kit";
import { useNuxtApp } from "#imports";

export function useToolRegistry(): ReadonlyMap<string, PublicToolManifest> {
  return useNuxtApp().$toolRegistry;
}
