<script setup lang="ts">
import { computed } from "vue";
import { queryCollection, useAsyncData, useSeoMeta } from "#imports";

defineOptions({
  name: "WorksIndexPage",
});

useSeoMeta({
  title: "作品",
});

const { data: works } = await useAsyncData("works:index", () =>
  queryCollection("works").where("status", "<>", "draft").all(),
);
const publicWorks = computed(() => (works.value ?? []).filter((work) => work.status !== "draft"));
</script>

<template>
  <div class="content-stack">
    <header class="page-intro">
      <p class="eyebrow">WORKS_INDEX</p>
      <h1>作品</h1>
      <p class="page-intro__summary">项目、工具与实验将在这里统一呈现。</p>
    </header>
    <div
      v-if="publicWorks.length > 0"
      class="card-grid"
    >
      <WorkCard
        v-for="work in publicWorks"
        :key="work.path"
        :work="work"
      />
    </div>
    <p
      v-else
      class="empty-state"
    >
      暂无公开作品。
    </p>
  </div>
</template>
