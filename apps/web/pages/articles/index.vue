<script setup lang="ts">
import { useSeoMeta } from "#imports";

defineOptions({
  name: "ArticlesIndexPage",
});

useSeoMeta({
  title: "文章",
});
</script>

<template>
  <section class="page-intro reading-surface">
    <p class="eyebrow">ARTICLES_INDEX</p>
    <h1>文章</h1>
    <p class="page-intro__summary">记录技术实践、产品构建与复盘。</p>
  </section>
</template>
