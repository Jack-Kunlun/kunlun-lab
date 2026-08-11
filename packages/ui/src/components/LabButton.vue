<template>
  <button
    class="lab-button"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.lab-button {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: var(--lab-accent);
  color: var(--lab-bg);
  cursor: pointer;
  font-family: var(--lab-font-sans);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
}

.lab-button:hover:not(:disabled) {
  filter: brightness(0.92);
}

.lab-button:focus-visible {
  outline: 2px solid var(--lab-focus);
  outline-offset: 2px;
}

.lab-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
