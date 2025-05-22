import { Request, Response } from "express";
import { getPageSpeedSummary, checkBrokenLinks } from "./service";
import { savePageSpeedAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import { saveBrokenLinkAnalysis } from "./brokenLink.service";

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

    
    const saved = await savePageSpeedAnalysis(website_id, summary);

    // const auditKeysToInclude = [
    //   "first_contentful_paint",
    //   "largest_contentful_paint",
    //   "total_blocking_time",
    //   "speed_index",
    //   "cumulative_layout_shift",
    //   "interactive",
    // ];

    const auditKeysToInclude = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "speed-index",
  "cumulative-layout-shift",
  "interactive",
];



const allAuditDetails = await prisma.pagespeed_audit.findMany({
  where: {
    website_analysis_id: saved.website_analysis_id,
  },
  select: {
    audit_key: true,
    title: true,
    description: true,
    score: true,
    display_value: true,
  },
});


// const auditMap: Record<string, any> = {};
// for (const audit of allAuditDetails) {
//   if (auditKeysToInclude.includes(audit.audit_key)) {
//     auditMap[audit.audit_key] = {
//       display_value: audit.display_value,
//       score: audit.score,
//     };
//   }
// }


const auditMap: Record<string, any> = {};
for (const audit of allAuditDetails) {
  if (auditKeysToInclude.includes(audit.audit_key)) {
    const normalizedKey = audit.audit_key.replace(/-/g, "_"); // convert to underscore
    auditMap[normalizedKey] = {
      display_value: audit.display_value,
      score: audit.score,
    };
  }
}


    // Add category scores (SEO, Accessibility, Mobile Friendly, etc)
    const categories = summary.categories || {};
    const categoryScores = {
      performance: categories.performance?.score != null ? categories.performance.score * 100 : null,
      seo: categories.seo?.score != null ? categories.seo.score * 100 : null,
      accessibility: categories.accessibility?.score != null ? categories.accessibility.score * 100 : null,
      "best_practices": categories["best-practices"]?.score != null ? categories["best-practices"].score * 100 : null,
      // pwa: categories.pwa?.score != null ? categories.pwa.score * 100 : null,
      // Mobile Friendly isn't a separate category in PageSpeed API v5; it is often part of SEO or mobile strategy.
      // But if you want mobile strategy you can add it as well:
      // mobile_friendly: categories["mobile-friendly"]?.score != null ? categories["mobile-friendly"].score * 100 : null,
    };

    return res.status(201).json({
      message: "PageSpeed summary saved successfully.",
      website_id: website_id,
      analysis_id: saved.website_analysis_id,
      // data: saved,
      categories: categoryScores,
      audits: auditMap,
      
      audit_details: allAuditDetails,   // <- return categories here
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



