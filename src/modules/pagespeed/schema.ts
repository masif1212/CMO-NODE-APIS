import { z } from "zod";

export const createWebsiteAnalysisSchema = z.object({
  website_id: z.string().uuid(),
  performance_score: z.number().min(0).max(100).nullable(),
  seo_score: z.number().min(0).max(100).nullable(),
  missing_image_alts: z.number().int().nonnegative().nullable(),
  first_contentful_paint: z.string().nullable(),
  largest_contentful_paint: z.string().nullable(),
  total_blocking_time: z.string().nullable(),
  speed_index: z.string().nullable(),
  cumulative_layout_shift: z.string().nullable(),
  time_to_interactive: z.string().nullable(),
  total_broken_links: z.number().int().nonnegative().nullable(),
  broken_links: z.any().nullable(),
});

export type CreateWebsiteAnalysisDto = z.infer<typeof createWebsiteAnalysisSchema>;
