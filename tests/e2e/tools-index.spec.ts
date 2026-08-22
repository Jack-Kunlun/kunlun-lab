import { expect, test } from "@playwright/test";

const TOOLS_PATH = "/tools";

test.describe("工具中心", () => {
  test("可直接访问并展示已注册的 JD 工具", async ({ page }) => {
    const response = await page.goto(TOOLS_PATH);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("工具 · Kunlun Lab");
    await expect(page.getByRole("heading", { name: "工具", exact: true })).toBeVisible();
    await expect(page.getByText("可直接使用的浏览器本地工具", { exact: true })).toBeVisible();

    const cards = page.getByRole("article");

    await expect(cards).toHaveCount(1);
    await expect(cards.getByRole("heading", { name: "前端岗位 JD 技能雷达" })).toBeVisible();
    await expect(cards.getByText("Alpha", { exact: true })).toBeVisible();
    await expect(cards.getByRole("link", { name: "打开工具" })).toHaveAttribute(
      "href",
      "/tools/jd-skill-radar",
    );
  });

  test("可从工具中心进入 JD 工具详情", async ({ page }) => {
    await page.goto(TOOLS_PATH);
    await page.getByRole("link", { name: "打开工具" }).click();

    await expect(page).toHaveURL(/\/tools\/jd-skill-radar$/);
    await expect(
      page.getByRole("heading", { name: "前端岗位 JD 技能雷达", exact: true }),
    ).toBeVisible();
  });
});
