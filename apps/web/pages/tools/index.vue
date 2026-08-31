<script setup lang="ts">
import type { PublicToolManifest } from "@kunlun/tool-kit";
import { StatusBadge } from "@kunlun/ui";
import { computed } from "vue";
import { useSeoMeta } from "#imports";
import { useToolRegistry } from "~/composables/useToolRegistry";

defineOptions({
  name: "ToolsIndexPage",
});

useSeoMeta({
  title: "工具",
});

const toolRegistry = useToolRegistry();

const statusLabels: Record<PublicToolManifest["status"], string> = {
  alpha: "Alpha",
  beta: "Beta",
  maintained: "持续维护",
};
const statusTones: Record<PublicToolManifest["status"], "experiment" | "neutral" | "online"> = {
  alpha: "experiment",
  beta: "experiment",
  maintained: "online",
};
const runtimeLabels: Record<PublicToolManifest["runtime"], string> = {
  client: "client / 浏览器本地",
};

const tools = computed(() => Array.from(toolRegistry.values()));
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
        :key="tool.id"
        class="work-card"
        :data-tool-card="tool.id"
      >
        <header class="work-card__header">
          <div class="work-card__meta">
            <span>{{ runtimeLabels[tool.runtime] }}</span>
            <StatusBadge
              :label="statusLabels[tool.status]"
              :tone="statusTones[tool.status]"
            />
          </div>
          <h2>{{ tool.title }}</h2>
          <p>{{ tool.description }}</p>
        </header>
        <div class="work-card__actions">
          <NuxtLink
            class="lab-action lab-action--primary"
            :to="`/tools/${tool.id}`"
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
