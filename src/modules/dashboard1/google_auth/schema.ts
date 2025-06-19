import { z } from "zod";

export const SaveTrafficSummarySchema = z.object({
  website_id: z.string().uuid(),
  summary: z.object({
    traffic: z.array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })),
        metricValues: z.array(z.object({ value: z.string() })),
      })
    ),
    country: z.array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })),
        metricValues: z.array(z.object({ value: z.string() })),
      })
    ),
    bouncePages: z.array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })),
        metricValues: z.array(z.object({ value: z.string() })),
      })
    ),
    activeUsers: z.string(),
    bounceRate: z.string(),
    timeTaken: z.string(),
  }),
});
