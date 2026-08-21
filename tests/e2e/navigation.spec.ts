import { expect, test } from "@playwright/test";

const NAV_ITEMS = [
  { label: "首页", href: "/", title: "首页 · Kunlun Lab" },
  { label: "作品", href: "/works", title: "作品 · Kunlun Lab" },
  { label: "文章", href: "/articles", title: "文章 · Kunlun Lab" },
  { label: "关于", href: "/about", title: "关于 · Kunlun Lab" },
] as const;

test.describe("主导航", () => {
  test("只暴露首页/作品/文章/关于四项导航，不出现实验室", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "主导航" });

    await expect(nav.getByRole("link")).toHaveText(["首页", "作品", "文章", "关于"]);
    await expect(nav.getByRole("link", { name: "实验室" })).toHaveCount(0);
  });

  test("当前页面导航项具备可辨识的 active 状态", async ({ page }) => {
    await page.goto("/articles");
    const activeLink = page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: "文章" });

    await expect(activeLink).toHaveClass(/router-link-exact-active/);
  });

  test("首页可以导航到作品、文章与关于", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "主导航" });

    await nav.getByRole("link", { name: "作品" }).click();
    await expect(page).toHaveURL(/\/works$/);
    await expect(page).toHaveTitle("作品 · Kunlun Lab");

    await nav.getByRole("link", { name: "文章" }).click();
    await expect(page).toHaveURL(/\/articles$/);
    await expect(page).toHaveTitle("文章 · Kunlun Lab");

    await nav.getByRole("link", { name: "关于" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle("关于 · Kunlun Lab");
  });

  test("从作品页返回首页后路径与标题正确", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: "作品" })
      .click();
    await expect(page).toHaveURL(/\/works$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle("首页 · Kunlun Lab");
  });

  test("skip link 指向主内容且可键盘聚焦", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator("a.skip-link");

    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
  });
});

test.describe("直接访问并刷新", () => {
  for (const item of NAV_ITEMS) {
    test(`${item.label}页面可直接访问并刷新`, async ({ page }) => {
      await page.goto(item.href);
      await expect(page).toHaveTitle(item.title);
      await page.reload();
      await expect(page).toHaveTitle(item.title);
    });
  }
});
