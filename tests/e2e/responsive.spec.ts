import { expect, test, type Page } from "@playwright/test";
import { VUE_JD } from "./fixtures/vue-jd";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement;

    return root.scrollWidth > root.clientWidth;
  });

  expect(hasOverflow).toBe(false);
}

test.describe("1440 桌面布局", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  // eslint-disable-next-line no-empty-pattern -- Playwright 要求解构 fixtures 参数，此处无需任何 fixture
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "仅 desktop 项目运行");
  });

  test("首页无水平溢出且核心内容可见", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalOverflow(page);
    await expect(
      page.getByRole("heading", { name: "个人主页与产品实验室", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "精选作品" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "最近记录" })).toBeVisible();
  });

  test("作品与文章索引卡片不溢出", async ({ page }) => {
    await page.goto("/works");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "前端面试知识库" })).toBeVisible();

    await page.goto("/articles");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "构建个人主页与产品实验室" })).toBeVisible();
  });

  test("工具页输入区与结果区不截断", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("900 断点布局", () => {
  test.use({ viewport: { width: 900, height: 1000 } });

  // eslint-disable-next-line no-empty-pattern -- Playwright 要求解构 fixtures 参数，此处无需任何 fixture
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "仅 desktop 项目运行");
  });

  test("900 断点下首页、作品、文章、工具均无横向溢出", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalOverflow(page);

    await page.goto("/works");
    await expectNoHorizontalOverflow(page);

    await page.goto("/articles");
    await expectNoHorizontalOverflow(page);

    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("900 断点下工具核心操作保持可见", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();
    await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeVisible();
  });
});

test.describe("390 移动布局", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // eslint-disable-next-line no-empty-pattern -- Playwright 要求解构 fixtures 参数，此处无需任何 fixture
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "仅 mobile 项目运行");
  });

  test("窄屏主导航可操作且首页核心内容不被截断", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalOverflow(page);
    const nav = page.getByRole("navigation", { name: "主导航" });

    await expect(nav.getByRole("link", { name: "作品" })).toBeVisible();
    await nav.getByRole("link", { name: "作品" }).click();
    await expect(page).toHaveURL(/\/works$/);
  });

  test("作品卡片、文章行与关于内容不溢出", async ({ page }) => {
    await page.goto("/works");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "前端面试知识库" })).toBeVisible();

    await page.goto("/articles");
    await expectNoHorizontalOverflow(page);

    await page.goto("/about");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "关于" })).toBeVisible();
  });

  test("文章正文在窄屏可读", async ({ page }) => {
    await page.goto("/articles/building-a-personal-lab");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "构建个人主页与产品实验室" })).toBeVisible();
  });

  test("工具输入区、结果区与核心操作在移动端可用", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();

    await expect(page.locator("[data-results]")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeVisible();
    await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeVisible();
    await expect(page.getByRole("button", { name: "清空重置" })).toBeVisible();

    await page.getByLabel("招聘 JD 纯文本").fill(`${VUE_JD}\n新增内容`);
    await expect(page.locator("[data-status]")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
