// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyMarkdown } from "./copy-markdown.ts";
import { downloadMarkdown } from "./download-markdown.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("copyMarkdown", () => {
  it("writes the exact Markdown through Clipboard API", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await copyMarkdown("# 分析结果");

    expect(writeText).toHaveBeenCalledExactlyOnceWith("# 分析结果");
  });

  it("rejects when Clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(copyMarkdown("# 分析结果")).rejects.toThrow("Clipboard API is unavailable.");
  });
});

describe("downloadMarkdown", () => {
  it("downloads a Markdown Blob and always cleans the temporary URL", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>().mockReturnValue("blob:jd-result");
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadMarkdown("# 分析结果", "jd-skill-radar.md");

    const blob = createObjectURL.mock.calls[0]?.[0];

    if (blob === undefined) {
      throw new Error("Expected a Markdown Blob.");
    }

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    await expect(blob.text()).resolves.toBe("# 分析结果");
    const clickedAnchor = click.mock.instances[0];

    if (!(clickedAnchor instanceof HTMLAnchorElement)) {
      throw new Error("Expected a temporary download anchor.");
    }

    expect(clickedAnchor.download).toBe("jd-skill-radar.md");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:jd-result");
    expect(document.querySelector("a")).toBeNull();
  });

  it("revokes the URL and removes the anchor when click throws", () => {
    const revokeObjectURL = vi.fn<(url: string) => void>();

    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:jd-result",
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => {
      downloadMarkdown("# 分析结果", "jd-skill-radar.md");
    }).toThrow("blocked");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:jd-result");
    expect(document.querySelector("a")).toBeNull();
  });
});
