<template>
  <section class="lab-panel">
    <slot />
  </section>
</template>

<style scoped>
.lab-panel {
  padding: 1rem;
  border: 1px solid var(--lab-border);
  border-radius: 0.5rem;
  background: var(--lab-surface);
  color: var(--lab-text);
}
</style>
