// @vitest-environment nuxt

import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import SiteHeader from "../../components/SiteHeader.vue";

describe("SiteHeader", () => {
  it("renders the five primary navigation destinations in order", async () => {
    const wrapper = await mountSuspended(SiteHeader);
    const navigation = wrapper.get("nav");
    const links = navigation.findAll("a");

    expect(navigation.attributes("aria-label")).toBe("主导航");
    expect(links.map((link) => link.text())).toEqual(["首页", "作品", "工具", "文章", "关于"]);
    expect(links.map((link) => link.attributes("href"))).toEqual([
      "/",
      "/works",
      "/tools",
      "/articles",
      "/about",
    ]);
  });
});
