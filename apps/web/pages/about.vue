<script setup lang="ts">
import { useSeoMeta } from "#imports";

defineOptions({
  name: "AboutPage",
});

useSeoMeta({
  title: "关于",
});
</script>

<template>
  <section class="page-intro reading-surface">
    <p class="eyebrow">ABOUT</p>
    <h1>关于</h1>
    <p class="page-intro__summary">这里将介绍技术方向、经历与可接受的合作类型。</p>
  </section>
</template>
