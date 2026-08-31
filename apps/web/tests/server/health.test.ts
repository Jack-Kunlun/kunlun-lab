// @vitest-environment node

import type { H3Event } from "h3";
import { describe, expect, it } from "vitest";
import healthHandler from "../../server/api/health.get";

describe("GET /api/health HTTP/process liveness", () => {
  it("returns exactly { status: ok }", () => {
    const response = healthHandler({} as H3Event);

    expect(response).toEqual({ status: "ok" });
  });

  it("does not expose extra fields", () => {
    const response = healthHandler({} as H3Event);

    expect(Object.keys(response)).toEqual(["status"]);
  });
});
