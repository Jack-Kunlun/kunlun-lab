export type WorkType = "project" | "tool" | "experiment";

export type PublishStatus = "draft" | "alpha" | "beta" | "maintained" | "archived";

export interface WorkMeta {
  title: string;
  description: string;
  type: WorkType;
  status: PublishStatus;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  appUrl?: string;
  sourceUrl?: string;
  caseStudyUrl?: string;
  toolId?: string;
}
