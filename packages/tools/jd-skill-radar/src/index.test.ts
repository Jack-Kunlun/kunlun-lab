import { describe, expect, it, vi } from "vitest";
import {
  copyMarkdown,
  downloadMarkdown,
  jdSkillRadarManifest,
  toMarkdown,
  useJdRadar,
} from "./index.ts";
import type {
  JdRadarController,
  JdRadarFeedback,
  JdRadarStatus,
  UseJdRadarOptions,
} from "./index.ts";

function acceptController(_controller: JdRadarController): void {
  void _controller;
}

function acceptFeedback(_feedback: JdRadarFeedback | null): void {
  void _feedback;
}

function acceptStatus(_status: JdRadarStatus): void {
  void _status;
}

function acceptOptions(_options: UseJdRadarOptions): void {
  void _options;
}

describe("JD radar Task 9 package entry", () => {
  it("exports local state and adapters without loading the lazy component", () => {
    const analyze = vi.fn(() => ({
      ok: false as const,
      error: { code: "EMPTY" as const, message: "请粘贴一份前端岗位 JD。" },
    }));
    const controller = useJdRadar({ analyze });

    expect(typeof toMarkdown).toBe("function");
    expect(typeof copyMarkdown).toBe("function");
    expect(typeof downloadMarkdown).toBe("function");
    expect(jdSkillRadarManifest.status).toBe("draft");
    expect(jdSkillRadarManifest.capabilities).toEqual([]);
    expect(analyze).not.toHaveBeenCalled();

    acceptController(controller);
    acceptFeedback(controller.feedback.value);
    acceptStatus(controller.status.value);
    acceptOptions({ analyze });
  });
});
