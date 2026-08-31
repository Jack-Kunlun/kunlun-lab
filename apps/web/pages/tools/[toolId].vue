<script setup lang="ts">
import { computed } from "vue";
import { createError, useRoute, useSeoMeta } from "#imports";
import InternalToolRenderer from "~/components/InternalToolRenderer.client.vue";
import { useToolRegistry } from "~/composables/useToolRegistry";

defineOptions({
  name: "InternalToolPage",
});

const route = useRoute();
const toolId = computed(() => {
  const routeToolId = route.params.toolId;

  return typeof routeToolId === "string" ? routeToolId : (routeToolId?.[0] ?? "");
});
const toolRegistry = useToolRegistry();
const manifest = toolRegistry.get(toolId.value);

if (!manifest) {
  throw createError({
    message: "工具不存在。",
    statusCode: 404,
  });
}

useSeoMeta({
  description: manifest.description,
  title: manifest.title,
});
</script>

<template>
  <section class="page-section internal-tool-page">
    <header class="page-intro">
      <p class="eyebrow">TOOL / {{ manifest.id }}</p>
      <h1>{{ manifest.title }}</h1>
      <p class="page-intro__summary">{{ manifest.description }}</p>
    </header>

    <ClientOnly>
      <InternalToolRenderer :manifest="manifest" />
      <template #fallback>
        <div
          aria-live="polite"
          data-tool-loading
          role="status"
        >
          工具正在加载，请稍候。
        </div>
      </template>
    </ClientOnly>
  </section>
</template>
