<script setup lang="ts">
import type { ToolManifest } from "@kunlun/shared";
import { ToolShell } from "@kunlun/tool-kit";
import type { Component } from "vue";
import { markRaw, onBeforeUnmount, shallowRef, ref, watch } from "vue";

const props = defineProps<{
  manifest: ToolManifest;
}>();

const state = ref<"ready" | "loading" | "error">("loading");
const loadedComponent = shallowRef<Component | null>(null);
let loadToken = 0;

async function load(): Promise<void> {
  const currentToken = ++loadToken;

  state.value = "loading";
  loadedComponent.value = null;

  try {
    const loaded = await props.manifest.component();

    if (currentToken !== loadToken) {
      return;
    }

    loadedComponent.value = markRaw(loaded.default);
    state.value = "ready";
  } catch (_error: unknown) {
    if (currentToken !== loadToken) {
      return;
    }

    state.value = "error";
  }
}

watch(
  () => props.manifest,
  () => {
    void load();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  loadToken += 1;
});
</script>

<template>
  <ToolShell
    :state="state"
    @retry="load"
  >
    <component :is="loadedComponent" />
    <template #loading>工具正在加载，请稍候。</template>
  </ToolShell>
</template>
