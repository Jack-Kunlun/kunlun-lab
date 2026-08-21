import { expect, test, type Page } from "@playwright/test";
import { VUE_JD } from "./fixtures/vue-jd";

/**
 * .jd-radar 使用 color-mix() 生成的 1px 网格背景，其亚像素抗锯齿在渲染引擎层面存在
 * 约 1% 的非确定性像素差异；这是渲染引擎固有行为，与页面内容/动画无关。
 * 首页与文章详情无网格背景，保持零容差。
 */
const JD_RADAR_SCREENSHOT_OPTIONS = { maxDiffPixelRatio: 0.02 };

async function waitForStableRendering(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test.describe("视觉基线", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  // eslint-disable-next-line no-empty-pattern -- Playwright 要求解构 fixtures 参数，此处无需任何 fixture
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "仅 desktop 项目生成视觉基线");
  });

  test("首页", async ({ page }) => {
    await page.goto("/");
    await waitForStableRendering(page);
    await expect(page).toHaveScreenshot("home.png");
  });

  test("文章详情", async ({ page }) => {
    await page.goto("/articles/building-a-personal-lab");
    await waitForStableRendering(page);
    await expect(page).toHaveScreenshot("article-detail.png");
  });

  test("JD Skill Radar idle", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await waitForStableRendering(page);
    await expect(page.locator(".jd-radar")).toHaveScreenshot(
      "jd-radar-idle.png",
      JD_RADAR_SCREENSHOT_OPTIONS,
    );
  });

  test("JD Skill Radar ready", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();
    await waitForStableRendering(page);
    await expect(page.locator(".jd-radar")).toHaveScreenshot(
      "jd-radar-ready.png",
      JD_RADAR_SCREENSHOT_OPTIONS,
    );
  });

  test("JD Skill Radar stale", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(`${VUE_JD}\n新增内容`);
    await expect(page.locator("[data-status]")).toBeVisible();
    await waitForStableRendering(page);
    await expect(page.locator(".jd-radar")).toHaveScreenshot(
      "jd-radar-stale.png",
      JD_RADAR_SCREENSHOT_OPTIONS,
    );
  });
});
