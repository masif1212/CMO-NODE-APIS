import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const youtubeStatsSchema = z.object({
  channelId: z.string().min(5, "Channel ID is required"),
  website_id: z
    .string()
    .min(1, "Website ID is required")
    .refine(
      async (id) => {
        const website = await prisma.user_websites.findUnique({
          where: { website_id: id },
        });
        return !!website;
      },
      { message: "Website ID does not exist" }
    ),
});

export type YoutubeStatsInput = z.infer<typeof youtubeStatsSchema>;