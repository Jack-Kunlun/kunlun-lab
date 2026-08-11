<script setup lang="ts">
defineProps<{
  label: string;
  value: number | string;
}>();
</script>

<template>
  <dl class="metric-cell">
    <div>
      <dt>{{ label }}</dt>
      <dd>{{ value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.metric-cell {
  min-width: 0;
  margin: 0;
  padding: 0.875rem;
  border: 1px solid var(--lab-border);
  background: var(--lab-surface);
}

.metric-cell div {
  display: grid;
  gap: 0.25rem;
}

.metric-cell dt {
  color: var(--lab-muted);
  font-family: var(--lab-font-mono);
  font-size: 0.75rem;
}

.metric-cell dd {
  margin: 0;
  color: var(--lab-text);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}
</style>
