import { expect, test, type Page } from "@playwright/test";
import { VUE_JD } from "./fixtures/vue-jd";
import { blockingViolations, createAxeScanner, describeViolations } from "./support/axe";

async function expectAccessible(page: Page): Promise<void> {
  const results = await createAxeScanner(page).analyze();
  const violations = blockingViolations(results);

  expect(violations, describeViolations(results)).toEqual([]);
}

test.describe("Axe 可访问性扫描", () => {
  test("首页", async ({ page }) => {
    await page.goto("/");
    await expectAccessible(page);
  });

  test("作品索引", async ({ page }) => {
    await page.goto("/works");
    await expectAccessible(page);
  });

  test("文章索引", async ({ page }) => {
    await page.goto("/articles");
    await expectAccessible(page);
  });

  test("文章详情", async ({ page }) => {
    await page.goto("/articles/building-a-personal-lab");
    await expectAccessible(page);
  });

  test("JD Skill Radar idle 状态", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await expectAccessible(page);
  });

  test("JD Skill Radar ready 状态", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();
    await expectAccessible(page);
  });
});

test.describe("键盘可访问性", () => {
  test("skip link 可键盘聚焦并跳转到主内容", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator("a.skip-link");
    const mainContent = page.locator("#main-content");

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    await expect(mainContent).toBeFocused();
  });

  test("主导航链接可键盘聚焦并导航", async ({ page }) => {
    await page.goto("/");
    const worksLink = page.getByRole("navigation", { name: "主导航" }).getByRole("link", {
      name: "作品",
    });

    await worksLink.focus();
    await expect(worksLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/works$/);
  });

  test("analyze 按钮可键盘触发", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);

    await page.getByRole("button", { name: "开始分析" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.locator("[data-results]")).toBeVisible();
  });

  test("checklist、复制、下载与 reset 均可键盘操作", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();

    const checkbox = page.getByRole("checkbox").first();

    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();

    await page.getByRole("button", { name: "复制 Markdown" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#jd-radar-feedback")).toContainText("已复制 Markdown");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "下载 Markdown" }).focus();
    await page.keyboard.press("Enter");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("jd-skill-radar.md");

    await page.getByRole("button", { name: "清空重置" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-results]")).toHaveCount(0);
  });
});

test.describe("可访问结构", () => {
  test("动态反馈使用 live region", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await expect(page.locator("#jd-radar-feedback")).toHaveAttribute("aria-live", "polite");
  });

  test("stale 状态转换后文案位于 live region", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();

    await page.getByLabel("招聘 JD 纯文本").fill(VUE_JD);
    await page.getByRole("button", { name: "开始分析" }).click();
    await expect(page.locator("[data-results]")).toBeVisible();

    await page.getByLabel("招聘 JD 纯文本").fill(`${VUE_JD}\n新增内容`);
    const staleNotice = page.locator("[data-status]");

    await expect(staleNotice).toBeVisible();
    await expect(staleNotice).toHaveAttribute("role", "status");
    await expect(staleNotice).toHaveAttribute("aria-live", "polite");
    await expect(staleNotice).toHaveAttribute("aria-atomic", "true");
  });

  test("表单控件具备可访问名称", async ({ page }) => {
    await page.goto("/tools/jd-skill-radar");
    await expect(page.getByLabel("招聘 JD 纯文本")).toBeVisible();
    await expect(page.getByLabel("招聘 JD 纯文本")).toHaveAttribute("aria-describedby");
  });

  test("首页具备唯一的主标题", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("个人主页与产品实验室");
  });

  test("文章详情具备唯一的主标题", async ({ page }) => {
    await page.goto("/articles/building-a-personal-lab");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});
