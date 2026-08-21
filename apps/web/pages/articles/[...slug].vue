<script setup lang="ts">
import { createError, queryCollection, useAsyncData, useRoute, useSeoMeta } from "#imports";

defineOptions({
  name: "ArticleDetailPage",
});

const route = useRoute();
const { data: article, error: articleError } = await useAsyncData(`article:${route.path}`, () =>
  queryCollection("articles").path(route.path).first(),
);

if (articleError.value || !article.value || article.value.draft) {
  throw createError({
    message: "文章不存在。",
    statusCode: 404,
  });
}

const articleEntry = article.value;

useSeoMeta({
  description: articleEntry.description,
  title: articleEntry.title,
});
</script>

<template>
  <div class="content-stack content-detail">
    <header class="page-intro content-detail__intro">
      <p class="eyebrow">ARTICLE / {{ articleEntry.publishedAt }}</p>
      <h1>{{ articleEntry.title }}</h1>
      <p class="page-intro__summary">{{ articleEntry.description }}</p>
    </header>
    <article class="reading-surface content-prose">
      <ContentRenderer :value="articleEntry" />
    </article>
  </div>
</template>
