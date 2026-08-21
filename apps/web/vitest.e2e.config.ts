import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/tool-route.test.ts", "tests/pages/content-pages.test.ts"],
  },
});
