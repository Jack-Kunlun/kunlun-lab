<script setup lang="ts">
import { computed } from "vue";
import { queryCollection, useAsyncData, useSeoMeta } from "#imports";
import CurrentBuild from "~/components/home/CurrentBuild.vue";
import HomeHero from "~/components/home/HomeHero.vue";
import SystemOverview from "~/components/home/SystemOverview.vue";

defineOptions({
  name: "HomePage",
});

useSeoMeta({
  title: "首页",
});

const [{ data: works }, { data: articles }] = await Promise.all([
  useAsyncData("home:works", () => queryCollection("works").where("status", "<>", "draft").all()),
  useAsyncData("home:articles", () => queryCollection("articles").where("draft", "=", false).all()),
]);

const publicWorks = computed(() => (works.value ?? []).filter((work) => work.status !== "draft"));
const publicArticles = computed(() => (articles.value ?? []).filter((article) => !article.draft));
const featuredWorks = computed(() => publicWorks.value.filter((work) => work.featured).slice(0, 3));
const recentArticles = computed(() =>
  [...publicArticles.value]
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .slice(0, 3),
);
</script>

<template>
  <div class="content-stack content-stack--home">
    <HomeHero />
    <CurrentBuild />
    <SystemOverview
      :articles-count="publicArticles.length"
      :works-count="publicWorks.length"
    />

    <section
      class="home-section"
      data-home-section="featured-works"
    >
      <header class="section-heading">
        <p class="eyebrow">FEATURED_WORKS</p>
        <h2>精选作品</h2>
        <p>项目、工具与实验，只展示已经公开的内容。</p>
      </header>
      <div class="card-grid">
        <WorkCard
          v-for="work in featuredWorks"
          :key="work.path"
          :work="work"
        />
      </div>
    </section>

    <section
      class="home-section"
      data-home-section="recent-articles"
    >
      <header class="section-heading">
        <p class="eyebrow">RECENT_BUILD_LOGS</p>
        <h2>最近记录</h2>
        <p>按发布时间倒序排列的构建记录与技术实践。</p>
      </header>
      <div class="article-list">
        <ArticleRow
          v-for="article in recentArticles"
          :key="article.path"
          :article="article"
        />
      </div>
    </section>

    <section
      class="home-section home-cooperation"
      data-home-section="cooperation"
    >
      <p class="eyebrow">COOPERATION</p>
      <h2>想了解这个实验室？</h2>
      <p>关于页面会持续保留当前已确认的项目背景与内容边界。</p>
      <NuxtLink
        class="lab-action lab-action--primary"
        to="/about"
      >
        查看关于
      </NuxtLink>
    </section>
  </div>
</template>
