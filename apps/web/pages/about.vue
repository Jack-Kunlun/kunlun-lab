<script setup lang="ts">
import { createError, queryCollection, useAsyncData, useRoute, useSeoMeta } from "#imports";

defineOptions({
  name: "AboutPage",
});

const route = useRoute();
const { data: page, error: pageError } = await useAsyncData("about:page", () =>
  queryCollection("pages").path(`/pages${route.path}`).first(),
);

if (pageError.value || !page.value) {
  throw createError({
    message: "关于页面不存在。",
    statusCode: 404,
  });
}

const aboutPage = page.value;

useSeoMeta({
  description: aboutPage.description,
  title: aboutPage.title,
});
</script>

<template>
  <div class="content-stack content-detail">
    <header class="page-intro content-detail__intro">
      <p class="eyebrow">ABOUT</p>
      <h1 v-if="aboutPage.title">{{ aboutPage.title }}</h1>
      <p
        v-if="aboutPage.description"
        class="page-intro__summary"
      >
        {{ aboutPage.description }}
      </p>
    </header>
    <article class="reading-surface content-prose">
      <ContentRenderer :value="aboutPage" />
    </article>
  </div>
</template>
