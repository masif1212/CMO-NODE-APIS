import { Request, Response } from "express";
import { getPageSpeedSummary, savePageSpeedAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

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
    console.log("website audit started")
    const summary = await getPageSpeedSummary(user_id, website_id);
    // const seoAudits = summary.seoAudits
    if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: summary,
      });
    } else (console.log("website audit processing complete"))

    // Step 2: Save PageSpeed analysis
    console.log("Saving website audit analysis to database...");
    const saved = await savePageSpeedAnalysis(user_id, website_id, summary);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: "Failed to save website audit analysis.",
      });
    } else (console.log("website audit analysis saved successfully"))

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
    const optimization_opportunities = summary.bestPracticeGroups || {};

    const auditMap: Record<string, any> = {};
    for (const audit of auditDetails) {
      if (auditKeysToInclude.includes(audit.id)) {
        const normalizedKey = audit.id.replace(/-/g, "_");
        auditMap[normalizedKey] = {
          display_value: audit.display_value,
          score: typeof audit.score === "number" ? audit.score : null,
        };
      }
    }

    // Category Scores
    const categories = summary.categories || {};
    const categoryScores = {
      performance_insight: categories.performance?.score != null ? categories.performance.score * 100 : null,
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




    const scrapedMeta = await prisma.website_scraped_data.findUnique({
      where: { website_id },
      select: {
        page_title: true,
        meta_description: true,
        meta_keywords: true,
        og_title: true,
        og_description: true,
        og_image: true,
        ctr_loss_percent: true,
        raw_html: true,
        homepage_alt_text_coverage: true,
        status_message: true,
        status_code: true,
        ip_address: true,
        response_time_ms: true,

      },
    });

    const {
      raw_html, // omit this
      ...metaDataWithoutRawHtml
    } = scrapedMeta || {};

    const seo_revenue_loss_percentage = (metaDataWithoutRawHtml as { ctr_loss_percent?: { CTR_Loss_Percent?: number } })?.ctr_loss_percent?.CTR_Loss_Percent ?? null;

    const availability_tracker = {
      status_message: scrapedMeta?.status_message ?? null,
      status_code: scrapedMeta?.status_code ?? null,
      ip_address: scrapedMeta?.ip_address ?? null,
      response_time_ms: scrapedMeta?.response_time_ms ?? null,
    };
    const website_health = {
  website_id,
  revenueLossPercent: saved.revenue_loss_percent,
  seo_revenue_loss_percentage,
  categories: categoryScores,
  speed_health: auditMap,
  availability_tracker,
  optimization_opportunities,
  // seo: seoAudits // include this if needed
};

    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        website_audit: JSON.stringify(website_health),
      },
      create: {
        user_id,
        website_id,
        website_audit: JSON.stringify(website_health),
      },
    });

     
    return res.status(201).json({
      message: "website audit",
      website_id,
      revenueLossPercent: saved.revenue_loss_percent,
      seo_revenue_loss_percentage,
      categories: categoryScores,
      speed_health: auditMap,
      availability_tracker,
      optimization_opportunities: optimization_opportunities,
      // seo: seoAudits
      // h1Text,
      // metaData: metaDataWithoutRawHtml,

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

