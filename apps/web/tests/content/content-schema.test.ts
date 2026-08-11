import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateContentDirectory } from "../../../../scripts/lib/content-validation";
import { articleSchema, workSchema } from "../../content.schema";

const sharedWorkFrontmatter = {
  description: "用于验证作品集合约束的测试条目。",
  featured: true,
  publishedAt: "2026-08-10",
  status: "maintained",
  title: "测试作品",
  type: "project",
  updatedAt: "2026-08-10",
} as const;

describe("workSchema", () => {
  it("rejects a published work without a launch destination", () => {
    expect(() => workSchema.parse(sharedWorkFrontmatter)).toThrow();
  });

  it("rejects a published work with both internal and external launch destinations", () => {
    expect(() =>
      workSchema.parse({
        ...sharedWorkFrontmatter,
        appUrl: "https://example.com/",
        toolId: "example-tool",
      }),
    ).toThrow();
  });

  it("accepts the external knowledge base with its application as the primary destination", () => {
    const result = workSchema.parse({
      ...sharedWorkFrontmatter,
      appUrl: "https://www.kunlunmarket.work/",
      title: "前端面试知识库",
    });

    expect(result.appUrl).toBe("https://www.kunlunmarket.work/");
    expect(result).not.toHaveProperty("toolId");
  });

  it("accepts an internal tool with a tool ID and no external application URL", () => {
    const result = workSchema.parse({
      ...sharedWorkFrontmatter,
      status: "alpha",
      title: "前端岗位 JD 技能雷达",
      toolId: "jd-skill-radar",
      type: "tool",
    });

    expect(result.toolId).toBe("jd-skill-radar");
    expect(result).not.toHaveProperty("appUrl");
  });

  it("accepts a draft without a launch destination", () => {
    expect(
      workSchema.parse({
        ...sharedWorkFrontmatter,
        status: "draft",
      }),
    ).not.toHaveProperty("appUrl");
  });
});

describe("articleSchema", () => {
  it("accepts a build record with dates, tags, featured state, and draft state", () => {
    const result = articleSchema.parse({
      draft: false,
      featured: true,
      publishedAt: "2026-08-10",
      tags: ["Nuxt", "产品实验室"],
      updatedAt: "2026-08-10",
    });

    expect(result).toEqual({
      draft: false,
      featured: true,
      publishedAt: "2026-08-10",
      tags: ["Nuxt", "产品实验室"],
      updatedAt: "2026-08-10",
    });
  });
});

describe("validateContentDirectory", () => {
  let fixtureDirectory = "";

  beforeEach(() => {
    fixtureDirectory = mkdtempSync(path.join(tmpdir(), "kunlun-content-"));
  });

  afterEach(() => {
    rmSync(fixtureDirectory, { force: true, recursive: true });
  });

  it("accepts valid Markdown entries from all three collections", () => {
    const entries = {
      "articles/build-record.md": `---
publishedAt: 2026-08-10
updatedAt: 2026-08-10
tags:
  - Nuxt
featured: true
draft: false
---

# 构建记录
`,
      "pages/about.md": `---
title: 关于
description: 关于这个个人主页与产品实验室。
---

# 关于
`,
      "works/knowledge-base.md": `---
title: 前端面试知识库
description: 独立维护的前端面试知识库。
type: project
status: maintained
publishedAt: 2026-08-10
updatedAt: 2026-08-10
featured: true
appUrl: https://www.kunlunmarket.work/
---

# 前端面试知识库
`,
    } as const;

    Object.entries(entries).forEach(([relativePath, content]) => {
      const filePath = path.join(fixtureDirectory, relativePath);

      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, content, "utf8");
    });

    expect(validateContentDirectory(fixtureDirectory)).toEqual([]);
  });

  it("reports a published work without a launch destination", () => {
    const filePath = path.join(fixtureDirectory, "works/broken.md");

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      `---
title: 无入口作品
description: 这个已发布作品没有可用入口。
type: project
status: maintained
publishedAt: 2026-08-10
updatedAt: 2026-08-10
featured: false
---
`,
      "utf8",
    );

    expect(validateContentDirectory(fixtureDirectory)).toEqual([
      {
        filePath: "works/broken.md",
        message: "作品必须声明唯一的启动入口；草稿可以暂不声明入口。",
      },
    ]);
  });

  it("reports Markdown without frontmatter", () => {
    const filePath = path.join(fixtureDirectory, "pages/about.md");

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, "# 关于\n", "utf8");

    expect(validateContentDirectory(fixtureDirectory)).toEqual([
      {
        filePath: "pages/about.md",
        message: "缺少 YAML frontmatter。",
      },
    ]);
  });
});
