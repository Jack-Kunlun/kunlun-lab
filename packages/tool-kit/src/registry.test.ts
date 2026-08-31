import type { ToolManifest } from "@kunlun/shared";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { createPublicToolRegistry, createToolRegistry, validateWorkToolLinks } from "./registry.ts";

const emptyComponent = defineComponent({
  render: () => null,
});

function manifest(id = "radar", overrides: Partial<ToolManifest> = {}): ToolManifest {
  return {
    capabilities: [],
    component: () => Promise.resolve({ default: emptyComponent }),
    description: "用于测试工具注册校验。",
    id,
    runtime: "client",
    status: "draft",
    title: "测试工具",
    ...overrides,
  };
}

describe("createToolRegistry", () => {
  it("indexes a valid manifest by its stable ID", () => {
    const radar = manifest("jd-skill-radar");
    const registry = createToolRegistry([radar]);

    expect([...registry.keys()]).toEqual(["jd-skill-radar"]);
    expect(registry.get("jd-skill-radar")).toBe(radar);
  });

  it("rejects duplicate manifest IDs", () => {
    expect(() => createToolRegistry([manifest("radar"), manifest("radar")])).toThrow(
      "Duplicate tool id: radar",
    );
  });

  it.each([
    [manifest(""), "Tool id must be non-empty."],
    [manifest("Bad_ID"), "Invalid tool id: Bad_ID"],
    [manifest("radar", { title: " " }), "Tool title must be non-empty: radar"],
    [manifest("radar", { description: " " }), "Tool description must be non-empty: radar"],
    [
      { ...manifest("radar"), runtime: "server" } as unknown as ToolManifest,
      "Unsupported tool runtime for radar: server",
    ],
    [
      { ...manifest("radar"), status: "archived" } as unknown as ToolManifest,
      "Unsupported tool status for radar: archived",
    ],
    [
      { ...manifest("radar"), capabilities: ["camera"] } as unknown as ToolManifest,
      "Unsupported capability for radar: camera",
    ],
    [
      manifest("radar", { capabilities: ["clipboard", "clipboard"] }),
      "Duplicate capability for radar: clipboard",
    ],
    [
      { ...manifest("radar"), component: null } as unknown as ToolManifest,
      "Invalid component loader for radar.",
    ],
  ])("rejects an invalid manifest", (invalidManifest, expectedMessage) => {
    expect(() => createToolRegistry([invalidManifest])).toThrow(expectedMessage);
  });
});

describe("createPublicToolRegistry", () => {
  it("keeps all valid manifests in the full registry but exposes only public statuses", () => {
    const draft = manifest("future-tool", { status: "draft" });
    const alpha = manifest("jd-skill-radar", { status: "alpha" });

    const fullRegistry = createToolRegistry([draft, alpha]);
    const publicRegistry = createPublicToolRegistry([draft, alpha]);

    expect([...fullRegistry.keys()]).toEqual(["future-tool", "jd-skill-radar"]);
    expect([...publicRegistry.keys()]).toEqual(["jd-skill-radar"]);
    expect(publicRegistry.get("jd-skill-radar")).toBe(alpha);
    expect(publicRegistry.has("future-tool")).toBe(false);
  });

  it("validates draft manifests before applying the public filter", () => {
    expect(() => createPublicToolRegistry([manifest("future-tool", { description: " " })])).toThrow(
      "Tool description must be non-empty: future-tool",
    );

    expect(() =>
      createPublicToolRegistry([manifest("future-tool"), manifest("future-tool")]),
    ).toThrow("Duplicate tool id: future-tool");
  });
});

describe("validateWorkToolLinks", () => {
  it("accepts external works and registered internal tools", () => {
    const registry = createToolRegistry([manifest("jd-skill-radar")]);

    expect(() => {
      validateWorkToolLinks(
        [{ title: "外部作品" }, { title: "前端岗位 JD 技能雷达", toolId: "jd-skill-radar" }],
        registry,
      );
    }).not.toThrow();
  });

  it("rejects a work that references a missing tool", () => {
    expect(() => {
      validateWorkToolLinks(
        [{ title: "缺失工具作品", toolId: "missing" }],
        new Map<string, ToolManifest>(),
      );
    }).toThrow("Unknown toolId \u0022missing\u0022 in work \u0022缺失工具作品\u0022.");
  });
});
