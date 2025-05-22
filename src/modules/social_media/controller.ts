// modules/youtube/controller.ts
import { Request, Response } from "express";
import { analyzeYouTubeDataByWebsiteId } from "./youtubeAnalysis";

export const analyzeYouTubeController = async (req: Request, res: Response) => {
  const { websiteId } = req.body;

  if (!websiteId) {
    return res.status(400).json({ error: "websiteId is required" });
  }

  try {
    const result = await analyzeYouTubeDataByWebsiteId(websiteId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error analyzing YouTube data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
