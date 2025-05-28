import { Request, Response } from "express";
import { getPageSpeedSummary, checkBrokenLinks } from "./service";
import { savePageSpeedAnalysis } from "./service";

import { saveBrokenLinkAnalysis } from "./brokenLink.service";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


export const handlePageSpeed = async (req: Request, res: Response) => {
  const { website_id, user_id } = req.body;

  if (!website_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: "Both 'website_id' and 'user_id' are required.",
    });
  }

  try {
    const summary = await getPageSpeedSummary(website_id);

    if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: summary,
      });
    }

    // Save PageSpeed analysis, including audits in `audit_details`
    const saved = await savePageSpeedAnalysis(website_id, summary);

    const auditKeysToInclude = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "speed-index",
      "cumulative-layout-shift",
      "interactive",
    ];

    // Read audit_details from saved analysis (already stored as JSON)
    const auditDetails = summary.audits || [];

    const auditMap: Record<string, any> = {};
    for (const audit of auditDetails) {
      if (auditKeysToInclude.includes(audit.id)) {
        const normalizedKey = audit.id.replace(/-/g, "_");
        auditMap[normalizedKey] = {
          display_value: audit.displayValue,
          score: typeof audit.score === "number" ? audit.score : null,
        };
      }
    }

    // Category Scores
    const categories = summary.categories || {};
    const categoryScores = {
      performance: categories.performance?.score != null ? categories.performance.score * 100 : null,
      seo: categories.seo?.score != null ? categories.seo.score * 100 : null,
      accessibility: categories.accessibility?.score != null ? categories.accessibility.score * 100 : null,
      best_practices: categories["best-practices"]?.score != null ? categories["best-practices"].score * 100 : null,
    };

    // Mark pagespeed_analysis as done
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        pagespeed_analysis: true,
      },
      create: {
        user_id,
        website_id,
        pagespeed_analysis: true,
      },
    });

    return res.status(201).json({
      message: "PageSpeed summary saved successfully.",
      website_id,
      analysis_id: saved.website_analysis_id,
      categories: categoryScores,
      audits: auditMap,
      audit_details: auditDetails, // entire raw audits object if needed
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
  const { website_id, user_id, maxDepth = 1 } = req.body;

  if (!website_id || !user_id) {
    return res.status(400).json({ error: "Both 'url' and 'user_id' are required." });
  }

  try {
    // Step 1: Ensure website is tracked
   

    // Step 2: Run the broken link crawler
    const brokenLinksResult = await checkBrokenLinks(website_id, maxDepth);

    const totalBroken = brokenLinksResult.length;

    // Step 3: Save analysis to DB
    const saved = await saveBrokenLinkAnalysis(website_id, brokenLinksResult, totalBroken);
   

    // Step 2: Mark brand audit as complete in analysis_status
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id: website_id,
        },
      },
      update: {
        broken_links: true,
      },
      create: {
        user_id,
        website_id: website_id,
        broken_links: true,
      },
    });
    return res.status(201).json({
      message: totalBroken ? "Broken links found and saved." : "No broken links found. Data recorded.",
      website_id: website_id,
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





