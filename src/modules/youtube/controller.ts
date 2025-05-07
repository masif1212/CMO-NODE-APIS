// import { Request, Response, NextFunction } from "express";
// import { fetchYoutubeStats } from "./service";
// import { PrismaClient } from "@prisma/client";
// import { z } from "zod";
// import { youtubeStatsSchema } from "./schema";

// const prisma = new PrismaClient();

// export const handleYoutubeStats = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
  
//   console.log("Request Body:", req.body); // Debug log

//   if (!req.is("application/json")) {
//     res.status(400).json({ error: "Content-Type must be application/json" });
//     return;
//   }

//   try {
//     const { channelId, website_id } = youtubeStatsSchema.parse(req.body);

//     const stats = await fetchYoutubeStats(channelId);

//     const saved = await prisma.brand_social_media_analysis.create({
//       data: {
//         website_id,
//         platform_name: "youtube",
//         followers: stats.followers,
//         likes: stats.likes,
//         comments: stats.comments,
//         shares: stats.shares,
//         videos_count: stats.videos_count,
//         engagement_rate: stats.engagement_rate,
//         data: stats.data,
//       },
//     });

//     res.status(200).json({
//       message: "YouTube data saved successfully",
//       data: saved,
//     });
//   } catch (err: any) {
//     if (err instanceof z.ZodError) {
//       res.status(400).json({ error: "Invalid input", details: err.errors });
//       return;
//     }
//     console.error("❌ Error:", err);
//     res.status(500).json({
//       error: "Failed to fetch/save YouTube data",
//       detail: err.message,
//     });
//   }
// };



import { Request, Response, NextFunction } from "express";
import { fetchYoutubeStats } from "./service";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { youtubeStatsSchema } from "./schema";

const prisma = new PrismaClient();

export const handleYoutubeStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Request Body:", req.body); // Debug log

  if (!req.is("application/json")) {
    res.status(400).json({ error: "Content-Type must be application/json" });
    return;
  }

  try {
    // Use parseAsync to handle async refinement
    const { channelId, website_id } = await youtubeStatsSchema.parseAsync(req.body);

    const stats = await fetchYoutubeStats(channelId);

    const saved = await prisma.brand_social_media_analysis.create({
      data: {
        website_id,
        platform_name: "youtube",
        followers: stats.followers,
        likes: stats.data.mostLikedVideo ? stats.data.mostLikedVideo.likes : 0,
        comments: stats.data.mostCommentedVideo ? stats.data.mostCommentedVideo.comments : 0,
        shares: 0, // Shares not available
        videos_count: stats.videos_count,
        posts_count: stats.data.mostLikedVideo || stats.data.mostCommentedVideo ? 1 : 0,
        engagement_rate: stats.engagement_rate,
        data: {
          channelTitle: stats.data.channelTitle,
          description: stats.data.description,
          country: stats.data.country,
          mostLikedVideo: stats.data.mostLikedVideo,
          mostCommentedVideo: stats.data.mostCommentedVideo,
        },
      },
    });

    res.status(200).json({
      message: "YouTube data saved successfully",
      data: saved,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    console.error("❌ Error:", err);
    res.status(500).json({
      error: "Failed to fetch/save YouTube data",
      detail: err.message,
    });
  }
};