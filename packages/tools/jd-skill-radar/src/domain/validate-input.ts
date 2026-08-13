import type { JdInputError } from "./types.ts";

export const MIN_JD_LENGTH = 80;
export const MAX_JD_LENGTH = 20_000;

const INPUT_ERRORS = {
  empty: Object.freeze({ code: "EMPTY", message: "请粘贴一份前端岗位 JD。" }),
  tooShort: Object.freeze({
    code: "TOO_SHORT",
    message: "JD 内容过短，请提供更完整的岗位描述。",
  }),
  tooLong: Object.freeze({
    code: "TOO_LONG",
    message: "JD 内容超过 20,000 个字符，请缩短后重试。",
  }),
} as const satisfies Readonly<Record<string, JdInputError>>;

export function validateInput(text: string): JdInputError | undefined {
  if (text.trim().length === 0) {
    return INPUT_ERRORS.empty;
  }

  if (text.length < MIN_JD_LENGTH) {
    return INPUT_ERRORS.tooShort;
  }

  if (text.length > MAX_JD_LENGTH) {
    return INPUT_ERRORS.tooLong;
  }

  return undefined;
}
