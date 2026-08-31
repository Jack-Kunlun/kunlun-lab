// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkMeta } from "@kunlun/shared";
import { resolvePrimaryWorkAction, resolveSecondaryWorkActions } from "@kunlun/shared";
import { fetch as fetchRoute, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

interface ContentEntry {
  draft?: boolean;
  featured?: boolean;
  publishedAt?: string;
  slug: string;
  status?: string;
  tags: string[];
  title: string;
}

const contentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../content");

// This suite reads the public content source only; production draft exclusion is covered by P0 gates.

await setup({
  browser: false,
  build: true,
  captureServerLogs: false,
  port: 43112,
  rootDir: process.cwd(),
  server: true,
});

function readCollection(collection: "articles" | "works"): ContentEntry[] {
  return readdirSync(path.join(contentRoot, collection))
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const source = readFileSync(path.join(contentRoot, collection, fileName), "utf8");
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source)?.[1] ?? "";
      const fields = new Map<string, string>();
      const tags: string[] = [];
      let readingTags = false;

      for (const line of frontmatter.split(/\r?\n/u)) {
        const tagMatch = /^\s+-\s+(.+)$/u.exec(line);

        if (readingTags && tagMatch?.[1] !== undefined) {
          tags.push(tagMatch[1].trim());
          continue;
        }

        const fieldMatch = /^([A-Za-z]+):\s*(.*)$/u.exec(line);

        if (!fieldMatch) {
          readingTags = false;
          continue;
        }

        const key = fieldMatch[1];
        const value = fieldMatch[2];

        readingTags = key === "tags";

        if (!readingTags && key !== undefined && value !== undefined) {
          fields.set(key, value.trim());
        }
      }

      return {
        draft: fields.get("draft") === "true",
        featured: fields.get("featured") === "true",
        publishedAt: fields.get("publishedAt"),
        slug: fileName.replace(/\.md$/u, ""),
        status: fields.get("status"),
        tags,
        title: fields.get("title") ?? fileName.replace(/\.md$/u, ""),
      };
    });
}

const works = readCollection("works");
const articles = readCollection("articles");
const publishedWorks = works.filter((work) => work.status !== "draft");
const publishedArticles = articles.filter((article) => article.draft !== true);
const featuredWorks = publishedWorks.filter((work) => work.featured === true);
const recentArticles = [...publishedArticles]
  .sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""))
  .slice(0, 3);
const uniqueTags = [...new Set(publishedArticles.flatMap((article) => article.tags))].sort((a, b) =>
  a.localeCompare(b),
);

function extractSection(html: string, section: string): string {
  const marker = html.indexOf(`data-home-section="${section}"`);
  const start = html.lastIndexOf("<section", marker);
  const end = html.indexOf("</section>", marker);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return html.slice(start, end);
}

function attributeValues(html: string, attribute: string): string[] {
  return [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "gu"))].flatMap(([, value]) =>
    value === undefined ? [] : [value],
  );
}

function metricValue(html: string, metric: string): string {
  const match = new RegExp(
    `data-metric="${metric}"[\\s\\S]*?data-metric-value="([^"]+)"`,
    "u",
  ).exec(html);

  expect(match).not.toBeNull();

  return match?.[1] ?? "";
}

async function fetchHtml(route: string): Promise<{ html: string; status: number }> {
  const response = await fetchRoute(route);

  return { html: await response.text(), status: response.status };
}

function makeWork(partial: Partial<WorkMeta> = {}): WorkMeta {
  return {
    description: "用于页面 action 策略测试的作品。",
    featured: false,
    publishedAt: "2026-08-10",
    status: "maintained",
    title: "测试作品",
    type: "project",
    updatedAt: "2026-08-10",
    ...partial,
  };
}

describe("content pages", () => {
  it("renders collection-backed home sections in the confirmed order", async () => {
    const { html, status } = await fetchHtml("/");

    expect(status).toBe(200);
    expect(attributeValues(html, "data-home-section")).toEqual([
      "hero",
      "current-build",
      "metrics",
      "featured-works",
      "recent-articles",
      "cooperation",
    ]);
    expect(metricValue(html, "published-works")).toBe(String(publishedWorks.length));
    expect(metricValue(html, "published-articles")).toBe(String(publishedArticles.length));
    expect(attributeValues(extractSection(html, "featured-works"), "data-work-title")).toEqual(
      featuredWorks.map((work) => work.title),
    );
    expect(attributeValues(extractSection(html, "recent-articles"), "data-article-title")).toEqual(
      recentArticles.map((article) => article.title),
    );

    for (const draft of works.filter((work) => work.status === "draft")) {
      expect(html).not.toContain(draft.title);
    }
  });

  it("renders the works index from public entries with type and status labels", async () => {
    const { html, status } = await fetchHtml("/works");

    expect(status).toBe(200);
    expect(attributeValues(html, "data-work-title")).toEqual(
      publishedWorks.map((work) => work.title),
    );
    expect(html).toContain("项目");
    expect(html).toContain("持续维护");

    for (const draft of works.filter((work) => work.status === "draft")) {
      expect(html).not.toContain(draft.title);
    }
  });

  it("orders public articles by publishedAt and exposes unique tag filters only", async () => {
    const { html, status } = await fetchHtml("/articles");

    expect(status).toBe(200);
    expect(attributeValues(html, "data-article-title")).toEqual(
      recentArticles.map((article) => article.title),
    );
    expect(attributeValues(html, "data-tag")).toEqual(uniqueTags);

    for (const draft of articles.filter((article) => article.draft === true)) {
      expect(html).not.toContain(draft.title);
    }

    expect((await fetchRoute("/articles/category/Nuxt")).status).toBe(404);
  });

  it("filters articles by a tag query and returns an empty result for an unknown tag", async () => {
    const matchingTag = uniqueTags.at(0);

    if (matchingTag === undefined) {
      throw new Error("Expected at least one published article tag.");
    }

    const matchingArticles = [...publishedArticles]
      .filter((article) => article.tags.includes(matchingTag))
      .sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));
    const matching = await fetchHtml(`/articles?tag=${encodeURIComponent(matchingTag)}`);
    const empty = await fetchHtml("/articles?tag=not-a-real-tag");

    expect(matching.status).toBe(200);
    expect(attributeValues(matching.html, "data-article-title")).toEqual(
      matchingArticles.map((article) => article.title),
    );
    expect(empty.status).toBe(200);
    expect(attributeValues(empty.html, "data-article-title")).toEqual([]);
  });

  it("renders direct article content and returns 404 for an unknown slug", async () => {
    const articleSlug = "building-a-personal-lab";
    const article = await fetchHtml(`/articles/${articleSlug}`);
    const unknown = await fetchHtml("/articles/not-a-real-article");

    expect(article.status).toBe(200);
    expect(article.html).toContain("reading-surface");
    expect(article.html).toContain("构建个人主页与产品实验室");
    expect(article.html).toContain("Nuxt");
    expect(unknown.status).toBe(404);
  });

  it("renders a published work detail and returns 404 for unknown or unpublished work paths", async () => {
    const publicWorkEntry = works.find((work) => work.slug === "interview-notes");

    if (publicWorkEntry === undefined) {
      throw new Error("Expected the published interview-notes work entry.");
    }

    const publicWork = await fetchHtml("/works/interview-notes");
    const unknown = await fetchHtml("/works/not-a-real-work");
    const draft = await fetchHtml("/works/jd-skill-radar");

    expect(publicWork.status).toBe(200);
    expect(publicWork.html).toContain(publicWorkEntry.title);
    expect(publicWork.html).toContain("reading-surface");
    expect(unknown.status).toBe(404);
    expect(draft.status).toBe(404);
  });

  it("renders the supplied about content without inventing unavailable fields", async () => {
    const { html, status } = await fetchHtml("/about");

    expect(status).toBe(200);
    expect(html).toContain("关于这个前端开发者的个人主页与产品实验室。");
    expect(html).toContain("这里会展示真实作品、记录构建过程");
    expect(html).not.toContain("联系方式");
    expect(html).not.toContain("社交链接");
  });

  it("keeps work actions inside the shared resolver policy", async () => {
    const worksPage = await fetchHtml("/works");
    const quote = String.fromCharCode(34);
    const expectedHref = `href=${quote}https://www.kunlunmarket.work/${quote}`;

    expect(worksPage.html).toContain(expectedHref);
    expect(worksPage.html).not.toContain("查看源码");
    expect(
      resolvePrimaryWorkAction(makeWork({ status: "alpha", toolId: "jd-skill-radar" }))?.href,
    ).toBe("/tools/jd-skill-radar");
    expect(resolvePrimaryWorkAction(makeWork({ status: "draft" }))).toBeNull();
    expect(
      resolveSecondaryWorkActions(
        makeWork({ sourceUrl: "https://github.com/example/personal-lab" }),
      ).map((action) => action.href),
    ).toEqual(["https://github.com/example/personal-lab"]);
  });
});
