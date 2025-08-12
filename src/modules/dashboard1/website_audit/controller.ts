import { Request, Response } from "express";
import { getPageSpeedData, savePageSpeedAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

export const handlePageSpeed = async (req: Request, res: Response) => {
  const { website_id, user_id, report_id } = req.body;

  if (!website_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: "Both 'website_id' and 'user_id' are required.",
    });
  }

  try {
    console.log("Website audit started");
    const report = await prisma.report.findUnique({
      where: { report_id: report_id }, // You must have 'report_id' from req.body
      select: { scraped_data_id: true }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "No report found with the given report_id.",
      });
    }
    const mainPageSpeedData = await getPageSpeedData(user_id, website_id);

    if (!mainPageSpeedData || typeof mainPageSpeedData !== "object" || Object.keys(mainPageSpeedData).length === 0) {
      return res.status(502).json({
        success: false,
        error: "Invalid or empty response from PageSpeed Insights API.",
        detail: mainPageSpeedData,
      });
    }

    console.log("Website audit processing complete");

    const saved = await savePageSpeedAnalysis(user_id, website_id, mainPageSpeedData, report_id);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: "Failed to save website audit analysis.",
      });
    }

    console.log("Website audit analysis saved successfully");

    // Extract directly from mainPageSpeedData
    const auditMap = Object.fromEntries(
      Object.entries(mainPageSpeedData.audits).map(([key, val]) => [
        key,
        {
          display_value: val.display_value,
          score: typeof val.score === "number" ? val.score : null,
        },
      ])
    );

    const categoryScores = {
      performance_insight: mainPageSpeedData.audit_details.categoryScores.performance,
      seo: mainPageSpeedData.audit_details.categoryScores.seo,
      accessibility: mainPageSpeedData.audit_details.categoryScores.accessibility,
      best_practices: mainPageSpeedData.audit_details.categoryScores["best_practices"],
      mobileFriendliness: mainPageSpeedData.audit_details.categoryScores.mobileFriendliness,
    };
    //  console.log("Category scores:", categoryScores);
    const website = await prisma.user_websites.findUnique({
      where: { website_id },
    });

    if (!website || !website.website_url) {
      throw new Error("Website URL not found for the given website_id");
    }

    const scrapedMeta = await prisma.website_scraped_data.findFirst({
      where: { scraped_data_id: report.scraped_data_id ?? undefined },
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
      raw_html, // Exclude this
      ...metaDataWithoutRawHtml
    } = scrapedMeta || {};

    const seo_revenue_loss_percentage =
      (metaDataWithoutRawHtml as { ctr_loss_percent?: { CTR_Loss_Percent?: number } })?.ctr_loss_percent?.CTR_Loss_Percent ?? null;

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
      optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
    };


    const website_data = {
      revenueLossPercent: saved.revenue_loss_percent,
      seo_revenue_loss_percentage,
      categories: categoryScores,
      speed_health: auditMap,

    };
    const combine_data = {
      full_report: website_health,
      data_for_llm: website_data,
    };

    const record = await prisma.report.upsert({
      where: {
        report_id: report_id, // this must be a UNIQUE constraint or @id in the model
      },
      update: {
        website_id: website_id,
        website_analysis_id: saved.website_analysis_id,
        dashboard1_Freedata: JSON.stringify(combine_data),
      },
      create: {
        website_id: website_id,
        website_analysis_id: saved.website_analysis_id,
        dashboard1_Freedata: JSON.stringify(combine_data),
      }
    });


    const existing = await prisma.analysis_status.findFirst({
      where: { report_id }
    });

    let update;
    if (existing) {
      update = await prisma.analysis_status.update({
        where: { id: existing.id },
        data: { website_id, website_audit: true }
      });
    } else {
      update = await prisma.analysis_status.create({
        data: { report_id, website_id, website_audit: true, user_id }
      });
    }



    return res.status(201).json({
      message: "Website audit completed",
      website_id,
      revenueLossPercent: saved.revenue_loss_percent,
      seo_revenue_loss_percentage,
      categories: categoryScores,
      speed_health: auditMap,
      availability_tracker,
      optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
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
