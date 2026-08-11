import { defineCollection, defineContentConfig } from "@nuxt/content";
import { articleSchema, pageSchema, workSchema } from "./content.schema";

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      source: "articles/**/*.md",
      type: "page",
      schema: articleSchema,
    }),
    pages: defineCollection({
      source: "pages/**/*.md",
      type: "page",
      schema: pageSchema,
    }),
    works: defineCollection({
      source: "works/**/*.md",
      type: "page",
      schema: workSchema,
    }),
  },
});
