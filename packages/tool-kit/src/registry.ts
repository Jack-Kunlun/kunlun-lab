import type { ToolManifest } from "@kunlun/shared";
import {
  supportedToolCapabilities,
  supportedToolRuntimes,
  supportedToolStatuses,
  toolIdPattern,
} from "./contract.ts";

export interface WorkToolLink {
  title: string;
  toolId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertToolManifest(value: unknown): asserts value is ToolManifest {
  if (!isRecord(value)) {
    throw new TypeError("Tool manifest must be an object.");
  }

  const id = typeof value.id === "string" ? value.id : "";

  if (id.trim().length === 0) {
    throw new TypeError("Tool id must be non-empty.");
  }

  if (!toolIdPattern.test(id)) {
    throw new TypeError(`Invalid tool id: ${id}`);
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new TypeError(`Tool title must be non-empty: ${id}`);
  }

  if (typeof value.runtime !== "string" || !supportedToolRuntimes.has(value.runtime)) {
    throw new TypeError(`Unsupported tool runtime for ${id}: ${String(value.runtime)}`);
  }

  if (typeof value.status !== "string" || !supportedToolStatuses.has(value.status)) {
    throw new TypeError(`Unsupported tool status for ${id}: ${String(value.status)}`);
  }

  if (!Array.isArray(value.capabilities)) {
    throw new TypeError(`Tool capabilities must be an array: ${id}`);
  }

  const seenCapabilities = new Set<string>();

  value.capabilities.forEach((capability: unknown) => {
    if (typeof capability !== "string" || !supportedToolCapabilities.has(capability)) {
      throw new TypeError(`Unsupported capability for ${id}: ${String(capability)}`);
    }

    if (seenCapabilities.has(capability)) {
      throw new TypeError(`Duplicate capability for ${id}: ${capability}`);
    }

    seenCapabilities.add(capability);
  });

  if (typeof value.component !== "function") {
    throw new TypeError(`Invalid component loader for ${id}.`);
  }
}

export function createToolRegistry(
  manifests: readonly ToolManifest[],
): ReadonlyMap<string, ToolManifest> {
  const registry = new Map<string, ToolManifest>();

  manifests.forEach((manifest) => {
    assertToolManifest(manifest);

    if (registry.has(manifest.id)) {
      throw new TypeError(`Duplicate tool id: ${manifest.id}`);
    }

    registry.set(manifest.id, manifest);
  });

  return registry;
}

export function validateWorkToolLinks(
  works: readonly WorkToolLink[],
  registry: ReadonlyMap<string, ToolManifest>,
): void {
  works.forEach(({ title, toolId }) => {
    if (toolId === undefined) {
      return;
    }

    if (!registry.has(toolId)) {
      throw new TypeError(`Unknown toolId "${toolId}" in work "${title}".`);
    }
  });
}
