import { brand_website_analysis } from "@prisma/client";

export type { brand_website_analysis };

export type PublicWebsiteAnalysis = Pick<
  brand_website_analysis,
  "website_analysis_id" | "website_id" | "performance_score" | "seo_score" | "first_contentful_paint" | "largest_contentful_paint" | "total_blocking_time" | "speed_index" | "cumulative_layout_shift" | "time_to_interactive" | "total_broken_links" | "created_at"
>;
