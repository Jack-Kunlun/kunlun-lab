import type { WorkMeta } from "./content.ts";

export interface WorkAction {
  kind: "launch" | "open-tool" | "case-study" | "source";
  label: string;
  href: string;
  external: boolean;
}

export function resolvePrimaryWorkAction(work: WorkMeta): WorkAction | null {
  if (work.status === "draft") {
    return null;
  }

  if (work.toolId !== undefined && work.toolId.length > 0) {
    return {
      kind: "open-tool",
      label: "打开工具",
      href: `/tools/${work.toolId}`,
      external: false,
    };
  }

  if (work.appUrl !== undefined && work.appUrl.length > 0) {
    return {
      kind: "launch",
      label: "访问实际应用",
      href: work.appUrl,
      external: true,
    };
  }

  return null;
}

export function resolveSecondaryWorkActions(work: WorkMeta): WorkAction[] {
  const actions: WorkAction[] = [];

  if (work.caseStudyUrl !== undefined && work.caseStudyUrl.length > 0) {
    actions.push({
      kind: "case-study",
      label: "查看案例",
      href: work.caseStudyUrl,
      external: false,
    });
  }

  if (work.sourceUrl !== undefined && work.sourceUrl.length > 0) {
    actions.push({
      kind: "source",
      label: "查看源码",
      href: work.sourceUrl,
      external: true,
    });
  }

  return actions;
}
