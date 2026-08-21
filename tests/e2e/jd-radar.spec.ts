import { expect, test, type Page } from "@playwright/test";
import { NO_SKILLS_JD, SHORT_JD, TOO_LONG_JD, VUE_JD } from "./fixtures/vue-jd";

const TOOL_PATH = "/tools/jd-skill-radar";
const input = (page: Page) => page.getByLabel("招聘 JD 纯文本");
const analyzeButton = (page: Page) => page.getByRole("button", { name: "开始分析" });

test.describe("JD Skill Radar 工具流程", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TOOL_PATH);
    await expect(input(page)).toBeVisible({ timeout: 30_000 });
  });

  test("工具页初始处于 idle 状态", async ({ page }) => {
    await expect(page.locator(".jd-radar--idle")).toBeVisible();
    await expect(page.locator("[data-results]")).toHaveCount(0);
    await expect(analyzeButton(page)).toBeEnabled();
  });

  test("输入有效 JD 后执行分析并展示结果摘要", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();

    const results = page.locator("[data-results]");

    await expect(results).toBeVisible();
    await expect(results.getByRole("heading", { name: "岗位概览" })).toBeVisible();
    await expect(results.getByRole("heading", { name: "技能分布" })).toBeVisible();
    await expect(results.getByRole("heading", { name: "关键词明细" })).toBeVisible();
    await expect(results.getByRole("heading", { name: "准备清单" })).toBeVisible();
    await expect(results.getByText("杭州 / 混合办公", { exact: true })).toBeVisible();
    await expect(results.getByText("本科", { exact: true })).toBeVisible();
  });

  test("分析结果区域只出现一份，不重复触发", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();
    await expect(page.locator("[data-results]")).toHaveCount(1);

    await analyzeButton(page).click();
    await expect(page.locator("[data-results]")).toHaveCount(1);
  });

  test("修改输入后旧结果变为 stale 且不再作为当前结果", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();
    await expect(page.locator("[data-results]")).toBeVisible();

    await input(page).fill(`${VUE_JD}\n新增：需要熟悉 React。`);
    await expect(page.locator("[data-status]")).toContainText("输入已修改，当前结果已过期");
  });

  test("checklist 可以切换勾选状态", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();

    const checkbox = page.getByRole("checkbox").first();

    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("复制操作产生可观察反馈", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();
    await page.getByRole("button", { name: "复制 Markdown" }).click();

    await expect(page.locator("#jd-radar-feedback")).toContainText("已复制 Markdown");
  });

  test("下载操作触发确定文件名的下载事件", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "下载 Markdown" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("jd-skill-radar.md");
  });

  test("reset 操作清空输入并回到 idle", async ({ page }) => {
    await input(page).fill(VUE_JD);
    await analyzeButton(page).click();
    await expect(page.locator("[data-results]")).toBeVisible();

    await page.getByRole("button", { name: "清空重置" }).click();

    await expect(input(page)).toHaveValue("");
    await expect(page.locator("[data-results]")).toHaveCount(0);
    await expect(page.locator(".jd-radar--idle")).toBeVisible();
  });
});

test.describe("JD Skill Radar 输入校验", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TOOL_PATH);
    await expect(input(page)).toBeVisible({ timeout: 30_000 });
  });

  test("空输入给出明确错误", async ({ page }) => {
    await analyzeButton(page).click();
    await expect(page.locator("#jd-radar-feedback")).toContainText("请粘贴一份前端岗位 JD。");
  });

  test("过短输入给出明确错误", async ({ page }) => {
    await input(page).fill(SHORT_JD);
    await analyzeButton(page).click();
    await expect(page.locator("#jd-radar-feedback")).toContainText("JD 内容过短");
  });

  test("过长输入给出明确错误", async ({ page }) => {
    await input(page).fill(TOO_LONG_JD);
    await analyzeButton(page).click();
    await expect(page.locator("#jd-radar-feedback")).toContainText("JD 内容超过 20,000 个字符");
  });

  test("无技能输入给出明确错误", async ({ page }) => {
    await input(page).fill(NO_SKILLS_JD);
    await analyzeButton(page).click();
    await expect(page.locator("#jd-radar-feedback")).toContainText("未识别到前端技能关键词");
  });

  test("unknown toolId 返回 404", async ({ page }) => {
    const response = await page.goto("/tools/not-registered");

    expect(response?.status()).toBe(404);
  });
});
