import { Request, Response } from "express";
import { getPageSpeedSummary, checkBrokenLinks } from "./service";
import { ensureUserWebsiteExists, savePageSpeedAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import { saveBrokenLinkAnalysis } from "./brokenLink.service";

const prisma = new PrismaClient();
export const handlePageSpeed = async (req: Request, res: Response) => {
  const { url, user_id } = req.body;

  if (!url || !user_id) {
    return res.status(400).json({
      success: false,
      error: "Both 'url' and 'user_id' are required.",
    });
  }

  try {
    // Step 1: Get summary from Google PageSpeed API
    const summary = await getPageSpeedSummary(url);

    // Step 2: Validate summary
    if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0 || !summary["Performance Score"]) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: summary,
      });
    }

    // Step 3: Create or fetch website record
    const website = await ensureUserWebsiteExists(url, user_id);

    // Step 4: Check if analysis already exists for this website (optional)
    // const existingAnalysis = await prisma.brand_website_analysis.findFirst({
    //   where: {
    //     website_id: website.website_id,
    //   },
    //   orderBy: { created_at: "desc" },
    // });

    // if (existingAnalysis) {
    //   return res.status(200).json({
    //     message: "PageSpeed summary already exists for this website.",
    //     website_id: website.website_id,
    //     analysis_id: existingAnalysis.website_analysis_id,
    //     data: existingAnalysis,
    //   });
    // }

    // Step 5: Save summary to DB
    const saved = await savePageSpeedAnalysis(website.website_id, summary);

    return res.status(201).json({
      message: "PageSpeed summary saved successfully.",
      website_id: website.website_id,
      analysis_id: saved.website_analysis_id,
      data: saved,
    });
  } catch (err: any) {
    console.error("❌ handlePageSpeed error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to process PageSpeed.",
      detail: err?.message || "Internal server error",
    });
  }
};

export const handleBrokenLinks = async (req: Request, res: Response) => {
  const { url, user_id, maxDepth = 1 } = req.body;

  if (!url || !user_id) {
    return res.status(400).json({ error: "Both 'url' and 'user_id' are required." });
  }

  try {
    // Step 1: Ensure website is tracked
    const website = await ensureUserWebsiteExists(url, user_id);

    // Step 2: Run the broken link crawler
    const brokenLinksResult = await checkBrokenLinks(url, maxDepth);

    const totalBroken = brokenLinksResult.length;

    // Step 3: Save analysis to DB
    const saved = await saveBrokenLinkAnalysis(website.website_id, brokenLinksResult, totalBroken);

    return res.status(201).json({
      message: totalBroken ? "Broken links found and saved." : "No broken links found. Data recorded.",
      website_id: website.website_id,
      analysis_id: saved.website_analysis_id,
      totalBroken,
      brokenLinks: brokenLinksResult,
    });
  } catch (err: any) {
    console.error("❌ handleBrokenLinks error:", err);
    return res.status(500).json({
      error: "Failed to check broken links.",
      detail: err?.message || "Internal server error",
    });
  }
};
