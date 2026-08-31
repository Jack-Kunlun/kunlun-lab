import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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

  it("rejects a draft article in the public content directory", () => {
    const filePath = path.join(fixtureDirectory, "articles/draft.md");

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      `---
publishedAt: 2026-08-10
updatedAt: 2026-08-10
tags:
  - 测试
featured: false
draft: true
---
`,
      "utf8",
    );

    expect(validateContentDirectory(fixtureDirectory)).toEqual([
      {
        filePath: "articles/draft.md",
        message: "公开文章不能是草稿；请将草稿移至 apps/web/content-drafts/ 或测试夹具目录。",
      },
    ]);
  });

  it("rejects a draft work in the public content directory", () => {
    const filePath = path.join(fixtureDirectory, "works/draft.md");

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      `---
title: 草稿作品
description: 仅供草稿目录校验使用。
type: tool
status: draft
publishedAt: 2026-08-10
updatedAt: 2026-08-10
featured: false
---
`,
      "utf8",
    );

    expect(validateContentDirectory(fixtureDirectory)).toEqual([
      {
        filePath: "works/draft.md",
        message: "公开作品不能是 draft；请将草稿移至 apps/web/content-drafts/ 或测试夹具目录。",
      },
    ]);
  });

  it("accepts draft entries when validating an isolated draft directory", () => {
    const entries = {
      "articles/draft.md": `---
publishedAt: 2026-08-10
updatedAt: 2026-08-10
tags:
  - 测试
featured: false
draft: true
---
`,
      "works/draft.md": `---
title: 草稿作品
description: 仅供草稿目录校验使用。
type: tool
status: draft
publishedAt: 2026-08-10
updatedAt: 2026-08-10
featured: false
---
`,
    } as const;

    Object.entries(entries).forEach(([relativePath, content]) => {
      const filePath = path.join(fixtureDirectory, relativePath);

      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, content, "utf8");
    });

    expect(validateContentDirectory(fixtureDirectory, { allowDrafts: true })).toEqual([]);
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

  it("rejects file, directory, and broken symlinks without following any of them", () => {
    const articleLink = path.join(fixtureDirectory, "articles/linked.md");
    const workLink = path.join(fixtureDirectory, "works/linked.md");
    const directoryLink = path.join(fixtureDirectory, "works/linked-directory");
    const brokenLink = path.join(fixtureDirectory, "pages/broken.md");

    mkdirSync(path.dirname(articleLink), { recursive: true });
    mkdirSync(path.dirname(workLink), { recursive: true });
    mkdirSync(path.dirname(brokenLink), { recursive: true });
    mkdirSync(path.join(fixtureDirectory, "symlink-target-directory"), { recursive: true });
    writeFileSync(path.join(fixtureDirectory, "article-target.txt"), "article target\n", "utf8");
    writeFileSync(path.join(fixtureDirectory, "work-target.txt"), "work target\n", "utf8");
    symlinkSync(path.join(fixtureDirectory, "article-target.txt"), articleLink);
    symlinkSync(path.join(fixtureDirectory, "work-target.txt"), workLink);
    symlinkSync(path.join(fixtureDirectory, "symlink-target-directory"), directoryLink, "dir");
    symlinkSync(path.join(fixtureDirectory, "missing-target.md"), brokenLink);

    const issues = validateContentDirectory(fixtureDirectory);

    expect(issues.map(({ filePath }) => filePath)).toEqual([
      "articles/linked.md",
      "pages/broken.md",
      "works/linked-directory",
      "works/linked.md",
    ]);
    expect(issues.every(({ message }) => message.includes("符号链接"))).toBe(true);
  });

  it("rejects a symlink validation root before traversing its target", () => {
    const rootTarget = path.join(fixtureDirectory, "root-target");
    const rootLink = path.join(fixtureDirectory, "root-link");

    mkdirSync(path.join(rootTarget, "articles"), { recursive: true });
    writeFileSync(
      path.join(rootTarget, "articles/draft.md"),
      "---\npublishedAt: 2026-08-10\nupdatedAt: 2026-08-10\ntags:\n  - 测试\nfeatured: false\ndraft: true\n---\n",
      "utf8",
    );
    symlinkSync(rootTarget, rootLink, "dir");

    expect(validateContentDirectory(rootLink)).toEqual([
      {
        filePath: ".",
        message: "内容校验根目录禁止符号链接；请使用真实目录。",
      },
    ]);
  });
});
