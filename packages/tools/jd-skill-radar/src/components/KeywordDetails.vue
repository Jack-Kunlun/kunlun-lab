<script setup lang="ts">
import type { DeepReadonly } from "vue";
import type { JdKeyword } from "../domain/types.ts";
import { REQUIREMENT_TONE_LABELS, SKILL_CATEGORY_LABELS } from "./presentation.ts";

defineProps<{ keywords: readonly DeepReadonly<JdKeyword>[] }>();
</script>

<template>
  <section
    class="jd-module"
    aria-labelledby="jd-keywords-heading"
  >
    <h2 id="jd-keywords-heading">关键词明细</h2>
    <article
      v-for="keyword in keywords"
      :key="keyword.skillId"
      class="jd-keyword"
    >
      <header>
        <h3>{{ keyword.label }}</h3>
        <span>{{ keyword.count }} 次</span>
        <span>{{ REQUIREMENT_TONE_LABELS[keyword.tone] }}</span>
        <span>{{ SKILL_CATEGORY_LABELS[keyword.category] }}</span>
      </header>
      <ul class="jd-keyword__contexts">
        <li
          v-for="(context, index) in keyword.contexts"
          :key="`${keyword.skillId}:${index}`"
        >
          {{ context }}
        </li>
      </ul>
    </article>
  </section>
</template>
