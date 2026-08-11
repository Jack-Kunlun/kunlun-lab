export default defineNuxtConfig({
  srcDir: ".",
  modules: ["@nuxt/content"],
  css: ["@kunlun/ui/styles/tokens.css", "@kunlun/ui/styles/base.css", "~/assets/css/main.css"],
  app: {
    head: {
      htmlAttrs: {
        lang: "zh-CN",
      },
      title: "个人主页与产品实验室",
      titleTemplate: "%s · Kunlun Lab",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          name: "description",
          content:
            "一个前端开发者的个人主页与产品实验室，分享技术实践，开发对工作和生活有用的小工具。",
        },
        {
          name: "color-scheme",
          content: "dark",
        },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
