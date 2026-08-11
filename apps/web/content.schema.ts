import { z } from "zod";

const isoDateSchema = z.iso.date();
const nonEmptyTextSchema = z.string().trim().min(1);

export const articleSchema = z.object({
  draft: z.boolean(),
  featured: z.boolean(),
  publishedAt: isoDateSchema,
  tags: z.array(nonEmptyTextSchema).min(1),
  updatedAt: isoDateSchema,
});

export const workSchema = z
  .object({
    appUrl: z.url().optional(),
    caseStudyUrl: z.url().optional(),
    description: nonEmptyTextSchema,
    featured: z.boolean(),
    publishedAt: isoDateSchema,
    sourceUrl: z.url().optional(),
    status: z.enum(["draft", "alpha", "beta", "maintained", "archived"]),
    title: nonEmptyTextSchema,
    toolId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    type: z.enum(["project", "tool", "experiment"]),
    updatedAt: isoDateSchema,
  })
  .refine(
    ({ appUrl, status, toolId }) => {
      const launchDestinationCount = [appUrl, toolId].filter(
        (destination) => destination !== undefined,
      ).length;

      return status === "draft" ? launchDestinationCount <= 1 : launchDestinationCount === 1;
    },
    {
      message: "作品必须声明唯一的启动入口；草稿可以暂不声明入口。",
    },
  );

export const pageSchema = z.object({
  description: nonEmptyTextSchema,
  title: nonEmptyTextSchema,
});
