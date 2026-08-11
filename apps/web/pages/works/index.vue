<script setup lang="ts">
import { useSeoMeta } from "#imports";

defineOptions({
  name: "WorksIndexPage",
});

useSeoMeta({
  title: "作品",
});
</script>

<template>
  <section class="page-intro">
    <p class="eyebrow">WORKS_INDEX</p>
    <h1>作品</h1>
    <p class="page-intro__summary">项目、工具与实验将在这里统一呈现。</p>
  </section>
</template>
