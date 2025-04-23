import { Request, Response } from "express";
import { getPageSpeedSummary, checkBrokenLinks } from "./service";

export const handlePageSpeed = async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const summary = await getPageSpeedSummary(url);
    return res.json(summary);
  } catch (err: any) {
    console.error("PageSpeed Error:", err.message);
    return res.status(500).json({ error: "PageSpeed fetch failed", detail: err.message });
  }
};

export const handleBrokenLinks = async (req: Request, res: Response) => {
  const { url, maxDepth = 1 } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const result = await checkBrokenLinks(url, maxDepth);
    return res.json({
      message: result.length ? "Broken links found" : "No broken links found",
      totalBroken: result.length,
      brokenLinks: result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Broken link check failed", detail: err.message });
  }
};
