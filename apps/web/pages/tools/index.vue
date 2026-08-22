<script setup lang="ts">
import type { ToolManifest } from "@kunlun/shared";
import { StatusBadge } from "@kunlun/ui";
import { computed } from "vue";
import { queryCollection, useAsyncData, useSeoMeta } from "#imports";
import { useToolRegistry } from "~/composables/useToolRegistry";

defineOptions({
  name: "ToolsIndexPage",
});

useSeoMeta({
  title: "工具",
});

const toolRegistry = useToolRegistry();
const { data: toolWorks } = await useAsyncData("tools:index", () =>
  queryCollection("works").where("type", "=", "tool").all(),
);

const statusLabels: Record<ToolManifest["status"], string> = {
  alpha: "Alpha",
  beta: "Beta",
  draft: "Draft",
  maintained: "持续维护",
};
const statusTones: Record<ToolManifest["status"], "experiment" | "neutral" | "online"> = {
  alpha: "experiment",
  beta: "experiment",
  draft: "neutral",
  maintained: "online",
};
const runtimeLabels: Record<ToolManifest["runtime"], string> = {
  client: "client / 浏览器本地",
};

const tools = computed(() => {
  const worksByToolId = new Map(
    (toolWorks.value ?? [])
      .filter((work) => work.type === "tool" && work.toolId && work.description)
      .map((work) => [work.toolId, work] as const),
  );

  return Array.from(toolRegistry.values()).flatMap((manifest) => {
    const work = worksByToolId.get(manifest.id);

    return work ? [{ description: work.description, manifest }] : [];
  });
});
</script>

<template>
  <div class="content-stack">
    <header class="page-intro">
      <p class="eyebrow">TOOLS_INDEX</p>
      <h1>工具</h1>
      <p class="page-intro__summary">可直接使用的浏览器本地工具</p>
    </header>
    <div
      v-if="tools.length > 0"
      class="card-grid"
    >
      <article
        v-for="tool in tools"
        :key="tool.manifest.id"
        class="work-card"
        :data-tool-card="tool.manifest.id"
      >
        <header class="work-card__header">
          <div class="work-card__meta">
            <span>{{ runtimeLabels[tool.manifest.runtime] }}</span>
            <StatusBadge
              :label="statusLabels[tool.manifest.status]"
              :tone="statusTones[tool.manifest.status]"
            />
          </div>
          <h2>{{ tool.manifest.title }}</h2>
          <p>{{ tool.description }}</p>
        </header>
        <div class="work-card__actions">
          <NuxtLink
            class="lab-action lab-action--primary"
            :to="`/tools/${tool.manifest.id}`"
          >
            打开工具
          </NuxtLink>
        </div>
      </article>
    </div>
    <p
      v-else
      class="empty-state"
    >
      暂无可用工具。
    </p>
  </div>
</template>
