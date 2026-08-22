import { expect, test } from "@playwright/test";

const articleDeepLink = "/articles/building-a-personal-lab";
const articleTitle = "构建个人主页与产品实验室";
const draftArticleDeepLink = "/articles/draft-deep-link-fixture";
const draftArticleTitle = "深链草稿回归夹具";
const draftArticleBody = "此内容仅用于验证草稿文章不会进入公开索引或通过深链访问。";
const workDeepLink = "/works/interview-notes";
const workTitle = "前端面试知识库";

test.describe("文章深链回归", () => {
  test("直接访问文章深链返回 200 且刷新后保持一致", async ({ page }) => {
    const response = await page.goto(articleDeepLink);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: articleTitle })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: articleTitle })).toBeVisible();
  });

  test("从文章索引点击进入详情与直接访问结果一致", async ({ page }) => {
    await page.goto("/articles");

    const entry = page.locator(`a[data-article-title="${articleTitle}"]`);

    await expect(entry).toHaveAttribute("href", articleDeepLink);
    await entry.click();

    await expect(page).toHaveURL(new RegExp(`${articleDeepLink}/?$`));
    await expect(page.getByRole("heading", { name: articleTitle })).toBeVisible();
  });

  test("未知文章 slug 返回明确 404", async ({ page }) => {
    const response = await page.goto("/articles/not-a-real-article");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面暂时无法访问")).toBeVisible();
  });

  test("文章草稿不会进入公开索引", async ({ page }) => {
    await page.goto("/articles");

    await expect(page.locator(`a[href="${draftArticleDeepLink}"]`)).toHaveCount(0);
    await expect(page.locator(`a[href^="${draftArticleDeepLink}"]`)).toHaveCount(0);
    await expect(page.getByText(draftArticleTitle)).toHaveCount(0);
  });

  test("文章草稿深链不会绕过发布规则", async ({ page }) => {
    const response = await page.goto(draftArticleDeepLink);

    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面暂时无法访问")).toBeVisible();
    await expect(page.getByRole("heading", { name: draftArticleTitle })).toHaveCount(0);
    await expect(page.getByText(draftArticleBody)).toHaveCount(0);

    await page.reload();

    await expect(page.getByText("页面暂时无法访问")).toBeVisible();
    await expect(page.getByText(draftArticleBody)).toHaveCount(0);
  });
});

test.describe("作品深链回归", () => {
  test("直接访问作品深链返回 200 且刷新后保持一致", async ({ page }) => {
    const response = await page.goto(workDeepLink);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: workTitle })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: workTitle })).toBeVisible();
  });

  test("从作品索引点击进入详情与直接访问结果一致", async ({ page }) => {
    await page.goto("/works");

    const card = page.locator(`article[data-work-card="${workDeepLink}"]`);
    const detailLink = card.getByRole("link", { name: "查看详情" });

    await expect(detailLink).toHaveAttribute("href", workDeepLink);
    await detailLink.click();

    await expect(page).toHaveURL(new RegExp(`${workDeepLink}/?$`));
    await expect(page.getByRole("heading", { name: workTitle })).toBeVisible();
  });
});

test.describe("分享后重新打开保持一致", () => {
  test("在新的浏览器上下文中重新打开文章深链结果一致", async ({ browser, page }) => {
    await page.goto(articleDeepLink);
    const sharedUrl = page.url();

    const freshContext = await browser.newContext();

    try {
      const freshPage = await freshContext.newPage();
      const response = await freshPage.goto(sharedUrl);

      expect(response?.status()).toBe(200);
      await expect(freshPage.getByRole("heading", { name: articleTitle })).toBeVisible();
    } finally {
      await freshContext.close();
    }
  });

  test("在新的浏览器上下文中重新打开作品深链结果一致", async ({ browser, page }) => {
    await page.goto(workDeepLink);
    const sharedUrl = page.url();

    const freshContext = await browser.newContext();

    try {
      const freshPage = await freshContext.newPage();
      const response = await freshPage.goto(sharedUrl);

      expect(response?.status()).toBe(200);
      await expect(freshPage.getByRole("heading", { name: workTitle })).toBeVisible();
    } finally {
      await freshContext.close();
    }
  });
});

test.describe("索引页内容深链可解析", () => {
  test("文章索引内所有文章深链都返回 200", async ({ page, request }) => {
    await page.goto("/articles");

    const hrefs = await page.locator("a[href^='/articles/']").evaluateAll((links) =>
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
      expect(status, `文章深链 ${href} 应返回 200`).toBe(200);
    }
  });

  test("作品索引内所有作品深链都返回 200", async ({ page, request }) => {
    await page.goto("/works");

    const hrefs = await page.locator("a[href^='/works/']").evaluateAll((links) =>
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
      expect(status, `作品深链 ${href} 应返回 200`).toBe(200);
    }
  });
});
