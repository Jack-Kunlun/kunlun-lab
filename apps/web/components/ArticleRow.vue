<script setup lang="ts">
interface ArticleEntry {
  description: string;
  path: string;
  publishedAt: string;
  tags: string[];
  title: string;
}

defineProps<{
  article: ArticleEntry;
}>();
</script>

<template>
  <article
    class="article-row"
    :data-article-row="article.path"
  >
    <div class="article-row__heading">
      <p class="eyebrow">
        <time :datetime="article.publishedAt">{{ article.publishedAt }}</time>
      </p>
      <h2>
        <NuxtLink
          class="article-row__title"
          :data-article-title="article.title"
          :to="article.path"
        >
          {{ article.title }}
        </NuxtLink>
      </h2>
    </div>
    <p class="article-row__description">{{ article.description }}</p>
    <ul
      v-if="article.tags.length > 0"
      class="tag-list"
      aria-label="文章标签"
    >
      <li
        v-for="tag in article.tags"
        :key="tag"
      >
        {{ tag }}
      </li>
    </ul>
  </article>
</template>
