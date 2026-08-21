<script setup lang="ts">
import { MetricCell } from "@kunlun/ui";

defineProps<{
  articlesCount: number;
  worksCount: number;
}>();
</script>

<template>
  <section
    class="home-section"
    data-home-section="metrics"
  >
    <header class="section-heading">
      <p class="eyebrow">SYSTEM_OVERVIEW</p>
      <h2>公开内容</h2>
      <p>只统计当前可以直接访问的文章与作品。</p>
    </header>
    <div class="metric-grid">
      <div
        data-metric="published-works"
        :data-metric-value="worksCount"
      >
        <MetricCell
          label="公开作品"
          :value="worksCount"
        />
      </div>
      <div
        data-metric="published-articles"
        :data-metric-value="articlesCount"
      >
        <MetricCell
          label="公开文章"
          :value="articlesCount"
        />
      </div>
    </div>
  </section>
</template>
