import { Request, Response } from "express";
import { getPageSpeedSummary, savePageSpeedAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

// export const handlePageSpeed = async (req: Request, res: Response) => {
//   const { website_id, user_id } = req.body;

//   if (!website_id || !user_id) {
//     return res.status(400).json({
//       success: false,
//       error: "Both 'website_id' and 'user_id' are required.",
//     });
//   }

//   try {
//     (console.log("PageSpeed processing ..."))
//     // Step 1: Get PageSpeed summary
//     const summary = await getPageSpeedSummary(user_id, website_id);

//     if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0) {
//       return res.status(502).json({
//         success: false,
//         error: "Invalid or empty response from PageSpeed Insights API.",
//         detail: summary,
//       });
//     } else (console.log("PageSpeed processing complete"))

//     // Step 2: Save PageSpeed analysis
//     console.log("Saving PageSpeed analysis to database...");
//     const saved = await savePageSpeedAnalysis(user_id, website_id, summary);
//     if (!saved) {
//       return res.status(500).json({
//         success: false,
//         error: "Failed to save PageSpeed analysis.",
//       });
//     }else (console.log("PageSpeed analysis saved successfully"))

//     const auditKeysToInclude = [
//       "first-contentful-paint",
//       "largest-contentful-paint",
//       "total-blocking-time",
//       "speed-index",
//       "cumulative-layout-shift",
//       "interactive",
//     ];

//     // Read audit_details from saved analysis
//     const auditDetails = summary.audits || [];
//     const optimization_opportunities = summary.bestPracticeGroups || {};

//     const auditMap: Record<string, any> = {};
//     for (const audit of auditDetails) {
//       if (auditKeysToInclude.includes(audit.id)) {
//         const normalizedKey = audit.id.replace(/-/g, "_");
//         auditMap[normalizedKey] = {
//           display_value: audit.displayValue,
//           score: typeof audit.score === "number" ? audit.score : null,
//         };
//       }
//     }

//     // Category Scores
//     const categories = summary.categories || {};
//     const categoryScores = {
//       performance_insight: categories.performance?.score != null ? categories.performance.score * 100 : null,
//       seo: categories.seo?.score != null ? categories.seo.score * 100 : null,
//       accessibility: categories.accessibility?.score != null ? categories.accessibility.score * 100 : null,
//       best_practices: categories["best-practices"]?.score != null ? categories["best-practices"].score * 100 : null,
//     };

   
//     const website = await prisma.user_websites.findUnique({
//       where: { website_id: website_id },
//     });
//     if (!website || !website.website_url) {
//       throw new Error("Website URL not found for the given website_id");
//     }

    


//     const scrapedMeta = await prisma.website_scraped_data.findUnique({
//   where: { website_id },
//   select: {
//     page_title: true,
//     meta_description: true,
//     meta_keywords: true,
//     og_title: true,
//     og_description: true,
//     og_image: true,
//     ctr_loss_percent: true,
//     raw_html: true,
//     homepage_alt_text_coverage: true,
//     status_message: true,
//     status_code: true,
//     ip_address: true,
//     response_time_ms: true,
    
//   },
// });

//   // let h1Text = "Not Found";
//   //   if (scrapedMeta && scrapedMeta.raw_html) {
//   //     const $ = cheerio.load(scrapedMeta.raw_html);
//   //     h1Text = $("h1").first().text().trim() || "Not Found";
//   //   }

//  const {
//   raw_html, // omit this
//   ...metaDataWithoutRawHtml
// } = scrapedMeta || {};
 
// const seo_revenue_loss_percentage = (metaDataWithoutRawHtml as { ctr_loss_percent?: { CTR_Loss_Percent?: number } })?.ctr_loss_percent?.CTR_Loss_Percent ?? null;

// const availability_tracker = {
//   status_message: scrapedMeta?.status_message ?? null,
//   status_code: scrapedMeta?.status_code ?? null,
//   ip_address: scrapedMeta?.ip_address ?? null,
//   response_time_ms: scrapedMeta?.response_time_ms ?? null,
// };


//   await prisma.analysis_status.upsert({
//   where: {
//     user_id_website_id: {
//       user_id,
//       website_id,
//     },
//   },
//   update: {
//     website_audit: saved.website_analysis_id,
//   },
//   create: {
//     user_id,
//     website_id,
//     website_audit: saved.website_analysis_id,
//   },
// });

// return res.status(201).json({
//   website_health : {
//   website_id,
//   revenueLossPercent: saved.revenue_loss_percent,
//   seo_revenue_loss_percentage,
//   categories: categoryScores,
//   speed_health: auditMap,
//   availability_tracker,
//   optimization_opportunities: optimization_opportunities,
//   }
//   // h1Text,
//   // metaData: metaDataWithoutRawHtml,
  
// });

//   } catch (err: any) {
//     console.error("❌ handlePageSpeed error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to process PageSpeed.",
//       detail: err?.message || "Internal server error",
//     });
//   }
// };




export const handlePageSpeed = async (req: Request, res: Response) => {
  const { website_id, user_id } = req.body;

  if (!website_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: "Both 'website_id' and 'user_id' are required.",
    });
  }

  try {
    console.log("[PageSpeed] Starting analysis...");

    // Step 1: Get PageSpeed summary
    const summary = await getPageSpeedSummary(user_id, website_id);

    if (!summary || typeof summary !== "object" || Object.keys(summary).length === 0) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: summary,
      });
    }

    console.log("[PageSpeed] Analysis complete. Saving to DB...");

    // Step 2: Save PageSpeed analysis
    const saved = await savePageSpeedAnalysis(user_id, website_id, summary);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: "Failed to save PageSpeed analysis.",
      });
    }

    console.log("[PageSpeed] Analysis saved.");

    const auditKeysToInclude = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "speed-index",
      "cumulative-layout-shift",
      "interactive",
    ];

    const auditDetails: Record<string, any> = summary.audits || {};
    const auditMap: Record<string, any> = {};
    for (const auditId of auditKeysToInclude) {
      const audit = auditDetails[auditId];
      if (audit) {
        const normalizedKey = auditId.replace(/-/g, "_");
        auditMap[normalizedKey] = {
          display_value: audit.displayValue,
          score: typeof audit.score === "number" ? audit.score : null,
        };
      }
    }

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
      return res.status(400).json({
        success: false,
        error: "Website URL not found for the given website_id.",
      });
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

    // 💥 Enhanced error handling based on scraping result
    if (!scrapedMeta) {
      return res.status(400).json({
        success: false,
        error: "Website content not found. The page may not exist or was never scraped.",
      });
    }

    if (scrapedMeta.status_code === 404) {
      return res.status(400).json({
        success: false,
        error: "Website returned 404 — the page does not exist.",
      });
    }

    if (
      scrapedMeta.status_code === 429 ||
      scrapedMeta.status_message?.toLowerCase().includes("blocked") ||
      scrapedMeta.raw_html?.includes("cf-challenge") ||
      scrapedMeta.raw_html?.includes("captcha")
    ) {
      return res.status(429).json({
        success: false,
        error: "Scraping was blocked. The target website may be using bot protection.",
        detail: scrapedMeta.status_message,
      });
    }

    const {
      raw_html, // omit this
      ...metaDataWithoutRawHtml
    } = scrapedMeta;

    const seo_revenue_loss_percentage =
      (metaDataWithoutRawHtml as { ctr_loss_percent?: { CTR_Loss_Percent?: number } })?.ctr_loss_percent?.CTR_Loss_Percent ?? null;

    const availability_tracker = {
      status_message: scrapedMeta?.status_message ?? null,
      status_code: scrapedMeta?.status_code ?? null,
      ip_address: scrapedMeta?.ip_address ?? null,
      response_time_ms: scrapedMeta?.response_time_ms ?? null,
    };

    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        website_audit: saved.website_analysis_id,
      },
      create: {
        user_id,
        website_id,
        website_audit: saved.website_analysis_id,
      },
    });

    return res.status(200).json({
      website_health: {
        website_id,
        revenueLossPercent: saved.revenue_loss_percent,
        seo_revenue_loss_percentage,
        categories: categoryScores,
        speed_health: auditMap,
        availability_tracker,
        optimization_opportunities: summary.bestPracticeGroups || {},
      },
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