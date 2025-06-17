import { Request, Response } from "express";
import { getPageSpeedSummary, savePageSpeedAnalysis } from "./service";
import { checkBrokenLinks } from "./service";
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
    // Step 1: Get PageSpeed summary
    const summary = await getPageSpeedSummary(user_id, website_id);

    if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: summary,
      });
    }

    // Step 2: Save PageSpeed analysis
    const saved = await savePageSpeedAnalysis(user_id, website_id, summary);

    const auditKeysToInclude = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "speed-index",
      "cumulative-layout-shift",
      "interactive",
    ];

    // Read audit_details from saved analysis
    const auditDetails = summary.audits || [];
    const best_practices_audits = summary.bestPracticeGroups || {};

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

   
    const website = await prisma.user_websites.findUnique({
      where: { website_id: website_id },
    });
    if (!website || !website.website_url) {
      throw new Error("Website URL not found for the given website_id");
    }

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
      message: "PageSpeed and schema summary saved successfully.",
      website_id,
      analysis_id: saved.website_analysis_id,
      revenueLossPercent: saved.revenue_loss_percent,
      categories: categoryScores,
      audits: auditMap,
      best_practices_audits: best_practices_audits,
      // audit_details: auditDetails,
      // schema_analysis: schemaResult.message ? { message: schemaResult.message } : schemaResult.schemas, // Include error or schemas
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
    const brokenLinksResult = await checkBrokenLinks(user_id, website_id, maxDepth);

    const totalBroken = brokenLinksResult.length;

    // Step 3: Save analysis to DB
    const saved = await saveBrokenLinkAnalysis(user_id, website_id, brokenLinksResult, totalBroken);


    // Step 4: Mark brand audit as complete in analysis_status
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