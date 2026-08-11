<script setup lang="ts">
const navigationItems = [
  { label: "首页", to: "/" },
  { label: "作品", to: "/works" },
  { label: "文章", to: "/articles" },
  { label: "关于", to: "/about" },
] as const;
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <NuxtLink
        class="site-brand"
        to="/"
        aria-label="Kunlun Lab 首页"
      >
        <span aria-hidden="true">&gt;_</span>
        <span>KUNLUN.LAB</span>
      </NuxtLink>
      <nav
        class="site-navigation"
        aria-label="主导航"
      >
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          class="site-navigation__link"
          :to="item.to"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
