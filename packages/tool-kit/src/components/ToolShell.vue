<script setup lang="ts">
import type { ToolShellState } from "../contract.ts";

defineProps<{
  state: ToolShellState;
  error?: unknown;
  feedback?: string;
}>();

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <section
    class="tool-shell"
    data-tool-shell
  >
    <div
      class="tool-shell__viewport"
      data-tool-viewport
    >
      <slot v-if="state === 'ready'" />
      <div
        v-else-if="state === 'loading'"
        aria-live="polite"
        role="status"
      >
        <slot name="loading">工具正在加载，请稍候。</slot>
      </div>
      <div
        v-else-if="state === 'error'"
        aria-live="assertive"
        role="alert"
      >
        <slot name="error">
          <p>工具暂时无法运行，请稍后重试。</p>
          <button
            data-test="retry"
            type="button"
            @click="$emit('retry')"
          >
            重试
          </button>
        </slot>
      </div>
      <div
        v-else
        aria-live="polite"
        role="status"
      >
        <slot name="feedback">{{ feedback ?? "操作已完成。" }}</slot>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-shell {
  border: 1px solid var(--color-border-subtle, rgb(255 255 255 / 12%));
  border-radius: var(--radius-panel, 0.5rem);
  padding: var(--space-panel, 1rem);
}

.tool-shell__viewport {
  min-width: 0;
}
</style>
