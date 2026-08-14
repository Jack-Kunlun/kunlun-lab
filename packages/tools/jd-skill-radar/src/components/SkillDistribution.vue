<script setup lang="ts">
import type { DeepReadonly } from "vue";
import type { JdCategoryScore } from "../domain/types.ts";
import { SKILL_CATEGORY_LABELS } from "./presentation.ts";

defineProps<{ categories: readonly DeepReadonly<JdCategoryScore>[] }>();
</script>

<template>
  <section
    class="jd-module"
    aria-labelledby="jd-distribution-heading"
  >
    <h2 id="jd-distribution-heading">技能分布</h2>
    <div
      v-for="category in categories"
      :key="category.category"
      class="jd-score-row"
    >
      <span>{{ SKILL_CATEGORY_LABELS[category.category] }}</span>
      <meter
        min="0"
        max="100"
        :value="category.score"
      >
        {{ category.score }} / 100
      </meter>
      <strong>{{ category.score }} / 100</strong>
      <span>{{ category.matchCount }} 次命中</span>
    </div>
  </section>
</template>
