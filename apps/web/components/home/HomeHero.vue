<script setup lang="ts">
import { StatusBadge } from "@kunlun/ui";
</script>

<template>
  <section
    class="home-section home-hero"
    data-home-section="hero"
  >
    <div class="home-hero__copy">
      <p class="eyebrow">FRONTEND_DEVELOPER / PRODUCT_LAB</p>
      <h1>个人主页与产品实验室</h1>
      <p class="home-hero__summary">分享技术实践，开发对工作和生活有用的小工具。</p>
    </div>
    <StatusBadge
      class="home-hero__status"
      label="持续构建中"
      tone="online"
    />
  </section>
</template>
