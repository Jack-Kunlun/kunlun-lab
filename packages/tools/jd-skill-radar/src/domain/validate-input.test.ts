import { describe, expect, it } from "vitest";
import { MAX_JD_LENGTH, MIN_JD_LENGTH, validateInput } from "./validate-input.ts";

describe("validateInput", () => {
  it("publishes the contract length limits", () => {
    expect(MIN_JD_LENGTH).toBe(80);
    expect(MAX_JD_LENGTH).toBe(20_000);
  });

  it.each([
    ["", { code: "EMPTY", message: "请粘贴一份前端岗位 JD。" }],
    [" \r\n ", { code: "EMPTY", message: "请粘贴一份前端岗位 JD。" }],
    ["V".repeat(79), { code: "TOO_SHORT", message: "JD 内容过短，请提供更完整的岗位描述。" }],
    [
      "V".repeat(20_001),
      { code: "TOO_LONG", message: "JD 内容超过 20,000 个字符，请缩短后重试。" },
    ],
  ] as const)("returns the expected error for invalid input", (text, error) => {
    expect(validateInput(text)).toEqual(error);
  });

  it("accepts exact boundary lengths", () => {
    expect(validateInput("V".repeat(80))).toBeUndefined();
    expect(validateInput("V".repeat(20_000))).toBeUndefined();
  });

  it("keeps fixed errors immutable across calls", () => {
    const first = validateInput("");

    expect(first).toBeDefined();

    if (first === undefined) {
      throw new Error("Expected empty input to return an error");
    }

    expect(Reflect.set(first, "message", "tampered")).toBe(false);

    expect(validateInput("")).toEqual({
      code: "EMPTY",
      message: "请粘贴一份前端岗位 JD。",
    });
  });
});
