<script setup lang="ts">
import { computed } from "vue";
import { createError, queryCollection, useAsyncData, useRoute, useSeoMeta } from "#imports";
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
const { data: work, error: workError } = await useAsyncData(`internal-tool:${toolId.value}`, () =>
  queryCollection("works").where("toolId", "=", toolId.value).first(),
);
const manifest = toolRegistry.get(toolId.value);
const resolvedWork = work.value;

if (
  workError.value ||
  !manifest ||
  resolvedWork?.type !== "tool" ||
  resolvedWork.toolId !== manifest.id
) {
  throw createError({
    message: "内部工具不存在。",
    statusCode: 404,
  });
}

const workMeta = resolvedWork;

useSeoMeta({
  description: workMeta.description,
  title: workMeta.title,
});
</script>

<template>
  <section class="page-section internal-tool-page">
    <header class="page-intro">
      <p class="eyebrow">INTERNAL_TOOL / {{ manifest.id }}</p>
      <h1>{{ workMeta.title }}</h1>
      <p class="page-intro__summary">{{ workMeta.description }}</p>
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
