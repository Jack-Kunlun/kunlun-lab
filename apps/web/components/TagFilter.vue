<script setup lang="ts">
defineProps<{
  selectedTag?: string;
  tags: string[];
}>();

function tagHref(tag: string): string {
  return `/articles?tag=${encodeURIComponent(tag)}`;
}
</script>

<template>
  <nav
    class="tag-filter"
    aria-label="按标签筛选文章"
  >
    <NuxtLink
      class="tag-filter__link"
      :aria-current="selectedTag ? undefined : 'page'"
      to="/articles"
    >
      全部
    </NuxtLink>
    <NuxtLink
      v-for="tag in tags"
      :key="tag"
      class="tag-filter__link"
      :data-tag="tag"
      :aria-current="selectedTag === tag ? 'page' : undefined"
      :to="tagHref(tag)"
    >
      {{ tag }}
    </NuxtLink>
  </nav>
</template>
