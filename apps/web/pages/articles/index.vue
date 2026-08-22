<script setup lang="ts">
import { computed } from "vue";
import { queryCollection, useAsyncData, useRoute, useSeoMeta } from "#imports";

defineOptions({
  name: "ArticlesIndexPage",
});

useSeoMeta({
  title: "文章",
});

const route = useRoute();
const { data: articles } = await useAsyncData("articles:index", () =>
  queryCollection("articles").where("draft", "=", false).all(),
);
const publicArticles = computed(() => (articles.value ?? []).filter((article) => !article.draft));
const selectedTag = computed(() =>
  typeof route.query.tag === "string" ? route.query.tag : undefined,
);
const articleTags = computed(() =>
  [...new Set(publicArticles.value.flatMap((article) => article.tags))].sort((a, b) =>
    a.localeCompare(b),
  ),
);
const filteredArticles = computed(() => {
  const visibleArticles = selectedTag.value
    ? publicArticles.value.filter((article) => article.tags.includes(selectedTag.value ?? ""))
    : publicArticles.value;

  return [...visibleArticles].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
});
</script>

<template>
  <div class="content-stack">
    <header class="page-intro">
      <p class="eyebrow">ARTICLES_INDEX</p>
      <h1>文章</h1>
      <p class="page-intro__summary">记录技术实践、产品构建与复盘。</p>
    </header>
    <TagFilter
      :selected-tag="selectedTag"
      :tags="articleTags"
    />
    <div
      v-if="filteredArticles.length > 0"
      class="article-list"
    >
      <ArticleRow
        v-for="article in filteredArticles"
        :key="article.path"
        :article="article"
      />
    </div>
    <p
      v-else
      class="empty-state"
    >
      当前标签下暂无文章。
    </p>
  </div>
</template>
