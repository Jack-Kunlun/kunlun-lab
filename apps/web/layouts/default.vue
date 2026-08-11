<script setup lang="ts">
defineOptions({
  name: "DefaultLayout",
});
</script>

<template>
  <div class="site-shell lab-grid">
    <a
      class="skip-link"
      href="#main-content"
    >
      跳到主要内容
    </a>
    <SiteHeader />
    <main
      id="main-content"
      class="site-main"
    >
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
