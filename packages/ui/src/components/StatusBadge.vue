<script setup lang="ts">
defineProps<{
  tone: "online" | "experiment" | "neutral";
  label: string;
}>();
</script>

<template>
  <span
    class="status-badge"
    :data-tone="tone"
  >
    <span
      aria-hidden="true"
      class="status-badge__marker"
    />
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--lab-border);
  border-radius: 999px;
  background: var(--lab-surface);
  color: var(--lab-muted);
  font-family: var(--lab-font-mono);
  font-size: 0.75rem;
  line-height: 1.25;
}

.status-badge__marker {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.status-badge[data-tone="online"] {
  color: var(--lab-accent);
}

.status-badge[data-tone="experiment"] {
  color: var(--lab-experiment);
}
</style>
