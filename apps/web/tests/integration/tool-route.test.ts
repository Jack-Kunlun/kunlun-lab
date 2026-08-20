// @vitest-environment node

import { fetch as fetchRoute, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

interface ErrorResponse {
  message?: string;
  statusCode: number;
}

await setup({
  browser: false,
  build: true,
  captureServerLogs: false,
  port: 43111,
  rootDir: process.cwd(),
  server: true,
});

describe("internal tool route", () => {
  it("renders the registered work metadata and client loading fallback through SSR", async () => {
    const response = await fetchRoute("/tools/jd-skill-radar");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("前端岗位 JD 技能雷达");
    expect(html).toContain("把一份前端招聘 JD 整理为可核对的技能信号与准备清单。");
    expect(html).toContain("工具正在加载，请稍候。");
  });

  it("returns a safe 404 for an unregistered tool without a registered tool marker", async () => {
    const response = await fetchRoute("/tools/not-registered");
    const errorResponse = JSON.parse(await response.text()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(errorResponse.statusCode).toBe(404);
    expect(errorResponse.message).toBe("内部工具不存在。");
    expect(errorResponse.message).not.toContain("not-registered");
    expect(errorResponse.message).not.toContain("jd-skill-radar");
  });
});
