<script setup lang="ts">
defineOptions({
  name: "AppErrorPage",
});

defineProps<{
  error: {
    statusCode?: number;
  };
}>();
</script>

<template>
  <div class="error-page lab-grid">
    <section class="error-panel">
      <p class="eyebrow">SYSTEM_STATUS / {{ error.statusCode ?? "ERROR" }}</p>
      <h1>页面暂时无法访问</h1>
      <p>请返回首页或稍后重试。</p>
      <NuxtLink
        class="text-link"
        to="/"
      >
        返回首页
      </NuxtLink>
    </section>
  </div>
</template>
