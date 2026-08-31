import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "ci.yml");
const dependabotPath = path.join(repositoryRoot, ".github", "dependabot.yml");

const forbiddenAutomationPatterns = [
  /auto-merge/i,
  /automerge/i,
  /auto merge/i,
  /auto-approve/i,
  /auto approve/i,
  /pull_request_target/i,
];

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("expected a mapping node");
  }

  return value;
}

function getJob(jobs: Record<string, unknown>, name: string): Record<string, unknown> {
  const job = jobs[name];

  if (!isRecord(job)) {
    throw new Error(`workflow job "${name}" must be defined as a mapping`);
  }

  return job;
}

function jobNeeds(job: Record<string, unknown>): string[] {
  const needs = job.needs;

  if (typeof needs === "string") {
    return [needs];
  }

  if (Array.isArray(needs)) {
    return needs.filter((entry): entry is string => typeof entry === "string");
  }

  return [];
}

function collectRunSteps(job: Record<string, unknown>): string[] {
  const steps = job.steps;

  if (!Array.isArray(steps)) {
    return [];
  }

  const commands: string[] = [];

  for (const step of steps) {
    if (isRecord(step) && typeof step.run === "string") {
      commands.push(step.run);
    }
  }

  return commands;
}

function collectUses(job: Record<string, unknown>): string[] {
  const steps = job.steps;

  if (!Array.isArray(steps)) {
    return [];
  }

  const uses: string[] = [];

  for (const step of steps) {
    if (isRecord(step) && typeof step.uses === "string") {
      uses.push(step.uses);
    }
  }

  return uses;
}

describe("continuous integration workflow policy", () => {
  const workflowText = readText(workflowPath);
  const workflow = asRecord(parse(workflowText));
  const jobs = asRecord(workflow.jobs);

  it("triggers on pull requests and pushes to main", () => {
    const triggerRecord = asRecord(workflow.on);

    expect(triggerRecord).toHaveProperty("pull_request");
    const push = asRecord(triggerRecord.push);

    expect(Array.isArray(push.branches)).toBe(true);
    expect((push.branches as unknown[]).includes("main")).toBe(true);
  });

  it("declares least-privilege read-only default permissions", () => {
    const permissions = asRecord(workflow.permissions);

    expect(permissions.contents).toBe("read");
  });

  it("defines quality, e2e, and docker gate jobs", () => {
    expect(Object.keys(jobs)).toEqual(expect.arrayContaining(["quality", "e2e", "docker"]));
  });

  it("makes e2e and docker depend on quality", () => {
    expect(jobNeeds(getJob(jobs, "e2e"))).toContain("quality");
    expect(jobNeeds(getJob(jobs, "docker"))).toContain("quality");
  });

  it("resolves Node from .node-version instead of a floating major", () => {
    const setupUses = Object.values(jobs)
      .filter(isRecord)
      .flatMap((job) => {
        const steps = job.steps;

        if (!Array.isArray(steps)) {
          return [] as Record<string, unknown>[];
        }

        return steps.filter(isRecord).filter((step) => {
          const uses = step.uses;

          return typeof uses === "string" && uses.startsWith("actions/setup-node");
        });
      });

    expect(setupUses.length).toBeGreaterThan(0);

    for (const step of setupUses) {
      const withBlock = asRecord(step.with);

      expect(withBlock["node-version-file"]).toBe(".node-version");
      expect(withBlock).not.toHaveProperty("node-version");
    }

    // 不得出现浮动 Node 主版本写法。
    expect(workflowText).not.toMatch(/node-version:\s*['"]?\d+\.x/i);
    expect(workflowText).not.toMatch(/node-version:\s*['"]?(?:lts|latest|\*)/i);
  });

  it("installs dependencies with a frozen lockfile in every Node job", () => {
    const nodeJobNames = ["quality", "e2e", "docker"];

    for (const name of nodeJobNames) {
      const runs = collectRunSteps(getJob(jobs, name)).join("\n");

      expect(runs).toContain("pnpm install --frozen-lockfile");
    }

    // 不得使用 npm 安装替代 pnpm。
    expect(workflowText).not.toMatch(/\bnpm (install|ci)\b/);
  });

  it("enables Corepack before running pnpm", () => {
    const runs = collectRunSteps(getJob(jobs, "quality")).join("\n");

    expect(runs).toMatch(/corepack enable/);
  });

  it("runs the full quality gate", () => {
    const runs = collectRunSteps(getJob(jobs, "quality")).join("\n");

    for (const command of [
      "pnpm validate:versions",
      "pnpm validate:text",
      "pnpm format:check",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm build",
      "pnpm test:content-boundary:build",
      "pnpm test:content-boundary:server",
    ]) {
      expect(runs).toContain(command);
    }
  });

  it("runs the full Playwright suite in the e2e job", () => {
    const e2eJob = getJob(jobs, "e2e");
    const runs = collectRunSteps(e2eJob).join("\n");

    expect(runs).toMatch(/playwright install --with-deps chromium/);
    expect(runs).toContain("pnpm test:e2e");

    const e2eStep = (e2eJob.steps as unknown[]).find(
      (step) => isRecord(step) && step.run === "pnpm test:e2e",
    );

    expect(isRecord(e2eStep)).toBe(true);
    expect(asRecord(asRecord(e2eStep).env).E2E_PORT).toBe("43117");
  });

  it("runs the shared cross-platform docker smoke entry", () => {
    const runs = collectRunSteps(getJob(jobs, "docker")).join("\n");

    expect(runs).toContain("pnpm test:docker");
    // docker job 不得重复实现健康检查逻辑或使用全局清理命令。
    expect(runs).not.toMatch(/docker (system|container|image|volume) prune/);
  });

  it("does not weaken tests via only/skip or lowered Axe gates", () => {
    expect(workflowText).not.toMatch(/test\.only|\.skip\b|--grep-invert/);
  });

  it("does not enable any automatic merge or approval behavior", () => {
    for (const pattern of forbiddenAutomationPatterns) {
      expect(pattern.test(workflowText)).toBe(false);
    }
  });

  it("uses a valid actions/checkout step in each Node job", () => {
    for (const name of ["quality", "e2e", "docker"]) {
      const uses = collectUses(getJob(jobs, name));

      expect(uses.some((entry) => entry.startsWith("actions/checkout"))).toBe(true);
    }
  });
});

describe("dependabot policy", () => {
  const dependabotText = readText(dependabotPath);
  const dependabot = asRecord(parse(dependabotText));

  function updates(): Record<string, unknown>[] {
    const raw = dependabot.updates;

    expect(Array.isArray(raw)).toBe(true);

    return (raw as unknown[]).filter(isRecord);
  }

  it("declares version 2", () => {
    expect(dependabot.version).toBe(2);
  });

  it("configures npm and github-actions ecosystems", () => {
    const ecosystems = updates().map((entry) => entry["package-ecosystem"]);

    expect(ecosystems).toContain("npm");
    expect(ecosystems).toContain("github-actions");
  });

  it("schedules every ecosystem weekly", () => {
    for (const entry of updates()) {
      const schedule = asRecord(entry.schedule);

      expect(schedule.interval).toBe("weekly");
    }
  });

  it("caps the number of open pull requests", () => {
    for (const entry of updates()) {
      const limit = entry["open-pull-requests-limit"];

      expect(typeof limit).toBe("number");
      expect(limit as number).toBeGreaterThan(0);
    }
  });

  it("does not enable automatic merge, approval, or privileged execution", () => {
    for (const pattern of forbiddenAutomationPatterns) {
      expect(pattern.test(dependabotText)).toBe(false);
    }
  });
});
