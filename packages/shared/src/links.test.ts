import { describe, expect, test } from "vitest";
import type { WorkMeta } from "./content.ts";
import { resolvePrimaryWorkAction, resolveSecondaryWorkActions } from "./links.ts";

function makeWork(partial: Partial<WorkMeta> = {}): WorkMeta {
  return {
    title: "Example work",
    description: "An example work used by link-policy tests.",
    type: "project",
    status: "maintained",
    publishedAt: "2026-08-10",
    updatedAt: "2026-08-10",
    featured: false,
    ...partial,
  };
}

describe("resolvePrimaryWorkAction", () => {
  test.each([
    [
      { status: "maintained", appUrl: "https://www.kunlunmarket.work/" },
      {
        kind: "launch",
        label: "访问实际应用",
        href: "https://www.kunlunmarket.work/",
        external: true,
      },
    ],
    [
      { status: "alpha", toolId: "jd-skill-radar" },
      {
        kind: "open-tool",
        label: "打开工具",
        href: "/tools/jd-skill-radar",
        external: false,
      },
    ],
    [{ status: "draft", appUrl: "https://app.example", toolId: "draft-tool" }, null],
    [{ status: "maintained", sourceUrl: "https://github.com/example/repo" }, null],
  ] as const)("selects only a permitted primary action", (partial, expected) => {
    expect(resolvePrimaryWorkAction(makeWork(partial))).toEqual(expected);
  });

  test("prefers an internal tool over an external application URL", () => {
    const work = makeWork({
      appUrl: "https://app.example",
      toolId: "jd-skill-radar",
    });

    expect(resolvePrimaryWorkAction(work)?.kind).toBe("open-tool");
  });

  test("does not create a primary action from empty targets", () => {
    expect(resolvePrimaryWorkAction(makeWork({ appUrl: "", toolId: "" }))).toBeNull();
  });
});

describe("resolveSecondaryWorkActions", () => {
  test("keeps case study and source as ordered secondary actions", () => {
    const work = makeWork({
      appUrl: "https://app.example",
      caseStudyUrl: "/works/example",
      sourceUrl: "https://github.com/example/repo",
    });

    expect(resolveSecondaryWorkActions(work)).toEqual([
      {
        kind: "case-study",
        label: "查看案例",
        href: "/works/example",
        external: false,
      },
      {
        kind: "source",
        label: "查看源码",
        href: "https://github.com/example/repo",
        external: true,
      },
    ]);
  });

  test("omits secondary actions whose URLs are absent", () => {
    expect(resolveSecondaryWorkActions(makeWork())).toEqual([]);
  });

  test("does not create secondary actions from empty URLs", () => {
    expect(resolveSecondaryWorkActions(makeWork({ caseStudyUrl: "", sourceUrl: "" }))).toEqual([]);
  });
});
