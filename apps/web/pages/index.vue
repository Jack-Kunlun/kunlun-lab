<script setup lang="ts">
import { useSeoMeta } from "#imports";

defineOptions({
  name: "HomePage",
});

useSeoMeta({
  title: "首页",
});
</script>

<template>
  <section class="page-intro">
    <p class="eyebrow">FRONTEND_DEVELOPER / PRODUCT_LAB</p>
    <h1>个人主页与产品实验室</h1>
    <p class="page-intro__summary">分享技术实践，开发对工作和生活有用的小工具。</p>
  </section>
</template>
