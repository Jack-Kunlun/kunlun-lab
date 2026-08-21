<script setup lang="ts">
import { computed } from "vue";
import { resolvePrimaryWorkAction, resolveSecondaryWorkActions } from "@kunlun/shared";
import type { WorkMeta } from "@kunlun/shared";
import { StatusBadge } from "@kunlun/ui";

interface WorkEntry extends WorkMeta {
  path: string;
}

const props = defineProps<{
  work: WorkEntry;
}>();

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

const normalizedWork = computed<WorkMeta>(() => ({
  ...props.work,
  appUrl: props.work.appUrl ?? undefined,
  caseStudyUrl: props.work.caseStudyUrl ?? undefined,
  sourceUrl: props.work.sourceUrl ?? undefined,
  toolId: props.work.toolId ?? undefined,
}));
const primaryAction = computed(() => resolvePrimaryWorkAction(normalizedWork.value));
const secondaryActions = computed(() => resolveSecondaryWorkActions(normalizedWork.value));
const typeLabel = computed(() => typeLabels[props.work.type]);
const statusLabel = computed(() => statusLabels[props.work.status]);
const statusTone = computed<"online" | "experiment" | "neutral">(() => {
  if (props.work.status === "maintained") {
    return "online";
  }

  if (props.work.status === "alpha" || props.work.status === "beta") {
    return "experiment";
  }

  return "neutral";
});
</script>

<template>
  <article
    class="work-card"
    :data-work-card="work.path"
  >
    <header class="work-card__header">
      <div class="work-card__meta">
        <span data-work-type>{{ typeLabel }}</span>
        <span data-work-status>
          <StatusBadge
            :label="statusLabel"
            :tone="statusTone"
          />
        </span>
      </div>
      <h2 :data-work-title="work.title">{{ work.title }}</h2>
      <p>{{ work.description }}</p>
    </header>

    <div class="work-card__actions">
      <a
        v-if="primaryAction?.external"
        class="lab-action lab-action--primary"
        data-work-primary-action
        :href="primaryAction.href"
        rel="noreferrer"
        target="_blank"
      >
        {{ primaryAction.label }}
      </a>
      <NuxtLink
        v-else-if="primaryAction"
        class="lab-action lab-action--primary"
        data-work-primary-action
        :to="primaryAction.href"
      >
        {{ primaryAction.label }}
      </NuxtLink>
      <NuxtLink
        class="text-link"
        :to="work.path"
      >
        查看详情
      </NuxtLink>
      <template
        v-for="action in secondaryActions"
        :key="action.kind"
      >
        <a
          v-if="action.external"
          class="text-link"
          :data-work-action="action.kind"
          :href="action.href"
          rel="noreferrer"
          target="_blank"
        >
          {{ action.label }}
        </a>
        <NuxtLink
          v-else
          class="text-link"
          :data-work-action="action.kind"
          :to="action.href"
        >
          {{ action.label }}
        </NuxtLink>
      </template>
    </div>
  </article>
</template>
