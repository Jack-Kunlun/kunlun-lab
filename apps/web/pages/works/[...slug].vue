<script setup lang="ts">
import { resolvePrimaryWorkAction, resolveSecondaryWorkActions } from "@kunlun/shared";
import type { WorkMeta } from "@kunlun/shared";
import { StatusBadge } from "@kunlun/ui";
import { computed } from "vue";
import { createError, queryCollection, useAsyncData, useRoute, useSeoMeta } from "#imports";

defineOptions({
  name: "WorkDetailPage",
});

const route = useRoute();
const { data: work, error: workError } = await useAsyncData(`work:${route.path}`, () =>
  queryCollection("works").path(route.path).first(),
);

if (workError.value || !work.value || work.value.status === "draft") {
  throw createError({
    message: "作品不存在。",
    statusCode: 404,
  });
}

const workEntry = work.value;
const normalizedWork = {
  ...workEntry,
  appUrl: workEntry.appUrl ?? undefined,
  caseStudyUrl: workEntry.caseStudyUrl ?? undefined,
  sourceUrl: workEntry.sourceUrl ?? undefined,
  toolId: workEntry.toolId ?? undefined,
};
const primaryAction = computed(() => resolvePrimaryWorkAction(normalizedWork));
const secondaryActions = computed(() => resolveSecondaryWorkActions(normalizedWork));
const typeLabels: Record<WorkMeta["type"], string> = {
  experiment: "实验",
  project: "项目",
  tool: "工具",
};
const statusLabels: Record<WorkMeta["status"], string> = {
  alpha: "Alpha",
  archived: "已归档",
  beta: "Beta",
  draft: "草稿",
  maintained: "持续维护",
};

useSeoMeta({
  description: workEntry.description,
  title: workEntry.title,
});
</script>

<template>
  <div class="content-stack content-detail">
    <header class="page-intro content-detail__intro">
      <p class="eyebrow">WORK_DETAIL / {{ workEntry.type.toUpperCase() }}</p>
      <h1>{{ workEntry.title }}</h1>
      <p class="page-intro__summary">{{ workEntry.description }}</p>
      <div class="detail-meta">
        <span>{{ typeLabels[workEntry.type] }}</span>
        <StatusBadge
          :label="statusLabels[workEntry.status]"
          :tone="workEntry.status === 'maintained' ? 'online' : 'experiment'"
        />
      </div>
      <div class="detail-actions">
        <a
          v-if="primaryAction?.external"
          class="lab-action lab-action--primary"
          :href="primaryAction.href"
          rel="noreferrer"
          target="_blank"
        >
          {{ primaryAction.label }}
        </a>
        <NuxtLink
          v-else-if="primaryAction"
          class="lab-action lab-action--primary"
          :to="primaryAction.href"
        >
          {{ primaryAction.label }}
        </NuxtLink>
        <template
          v-for="action in secondaryActions"
          :key="action.kind"
        >
          <a
            v-if="action.external"
            class="text-link"
            :href="action.href"
            rel="noreferrer"
            target="_blank"
          >
            {{ action.label }}
          </a>
          <NuxtLink
            v-else
            class="text-link"
            :to="action.href"
          >
            {{ action.label }}
          </NuxtLink>
        </template>
      </div>
    </header>
    <article class="reading-surface content-prose">
      <ContentRenderer :value="workEntry" />
    </article>
  </div>
</template>
