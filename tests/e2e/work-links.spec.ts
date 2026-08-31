import { expect, test } from "@playwright/test";

test.describe("作品索引链接", () => {
  test("interview-notes 主按钮指向真实外部地址", async ({ page }) => {
    await page.goto("/works");

    await expect(page.getByRole("link", { name: "访问实际应用" })).toHaveAttribute(
      "href",
      "https://www.kunlunmarket.work/",
    );
  });

  test("无 sourceUrl 的作品不显示 source 链接", async ({ page }) => {
    await page.goto("/works");

    await expect(page.getByRole("link", { name: "查看源码" })).toHaveCount(0);
  });

  test("未发布作品案例不出现在公开索引（防御性回归）", async ({ page }) => {
    await page.goto("/works");

    await expect(page.getByText("前端岗位 JD 技能雷达")).toHaveCount(0);
  });
});

test.describe("作品详情与未发布路径", () => {
  test("已发布作品详情可直接访问并刷新", async ({ page }) => {
    const response = await page.goto("/works/interview-notes");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "前端面试知识库" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "前端面试知识库" })).toBeVisible();
  });

  test("未知作品 slug 返回明确 404", async ({ page }) => {
    const response = await page.goto("/works/not-a-real-work");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面暂时无法访问")).toBeVisible();
  });

  test("未发布作品案例路径保持 404（防御性回归）", async ({ page }) => {
    // The case-study Markdown is outside the production content source; this is a path-level check.
    const response = await page.goto("/works/jd-skill-radar");

    expect(response?.status()).toBe(404);
  });
});

test.describe("工具入口", () => {
  test("JD Skill Radar 公开 Alpha 工具入口指向 /tools/jd-skill-radar 且可直接访问", async ({
    page,
  }) => {
    const response = await page.goto("/tools/jd-skill-radar");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "前端岗位 JD 技能雷达" })).toBeVisible();
  });

  test("未注册 toolId 返回 404 且不加载任意工具组件", async ({ page }) => {
    const response = await page.goto("/tools/not-registered");

    expect(response?.status()).toBe(404);
    await expect(page.locator("[data-tool-viewport]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "前端岗位 JD 技能雷达" })).toHaveCount(0);
  });
});

test.describe("公开内容深链", () => {
  test("首页公开内容链接都指向已实现页面", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("a[href^='/works/'], a[href^='/articles/']")
      .evaluateAll((links) =>
        links.flatMap((link) => {
          const href = link.getAttribute("href");

          return href === null ? [] : [href];
        }),
      );

    expect(hrefs.length).toBeGreaterThan(0);

    const statuses = await Promise.all(
      hrefs.map((href) =>
        request.get(href).then((response) => ({ href, status: response.status() })),
      ),
    );

    for (const { href, status } of statuses) {
      expect(status, `链接 ${href} 应返回 200`).toBe(200);
    }
  });
});
