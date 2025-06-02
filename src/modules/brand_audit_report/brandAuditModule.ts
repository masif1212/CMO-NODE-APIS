// 





import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { generateLLMAuditReportForPagespeed } from "./llm_pagespeed";
import { generateLLMTrafficReport } from "./llm_trafficAnalysis";
import { generateLLMCombinedAuditReport } from "./generateLLMCombinedAuditReport";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

export const createBrandAudit = async (websiteId: string, user_id: string) => {
  try {
    const analysisStatus = await prisma.analysis_status.findUnique({
      where: {
        user_id_website_id: {
          user_id,
          website_id: websiteId,
        },
      },
    });

    if (!analysisStatus) {
      throw new Error("No analysis selection found for this website.");
    }

    const {
      pagespeed_analysis,
      broken_links,
      social_media_analysis,
      traffic_analysis,
    } = analysisStatus;

    const hasPagespeedOrBroken = pagespeed_analysis || broken_links;
    const onlyPagespeedOrBroken = hasPagespeedOrBroken && !traffic_analysis && !social_media_analysis;
    const onlyTraffic = traffic_analysis && !hasPagespeedOrBroken && !social_media_analysis;
    const onlySocialMedia = social_media_analysis && !hasPagespeedOrBroken && !traffic_analysis;

    // Decision tree based on your requested logic
    if (onlyPagespeedOrBroken) {
      console.log("Generating Pagespeed/Broken Links combined report (single function) for website:", websiteId);
      await generateLLMAuditReportForPagespeed(websiteId);
      // Note: broken_links true here but we only call pagespeed generator, as per your logic.
      return fetchSingleReport(user_id, websiteId, "pagespeed");
    }

    if (onlyTraffic) {
      console.log("Generating Traffic report for website:", websiteId);
      await generateLLMTrafficReport(websiteId);
      return fetchSingleReport(user_id, websiteId, "traffic");
    }

    if (onlySocialMedia) {
      console.log("Generating Social Media report for website:", websiteId);
      // Uncomment and implement when ready
      // await generateLLMAuditReportForSocialMedia(websiteId);
      return fetchSingleReport(user_id, websiteId, "social_media");
    }

    // For any other combination (multiple true or mixed), generate combined report
    console.log("Multiple or mixed analyses active, generating combined report for website:", websiteId);
    const combinedAudit = await generateLLMCombinedAuditReport(websiteId);

    return {
      websiteId,
      brandAudit: combinedAudit,
      source: "combined",
    };

  } catch (error) {
    console.error("Error in createBrandAudit:", error);
    throw new Error("Failed to generate brand audit.");
  }
};

// Helper function to fetch the single report from DB by type
const fetchSingleReport = async (user_id: string, websiteId: string, reportType: string) => {
  const userWebsite = await prisma.user_websites.findFirst({
    where: {
      user_id,
      website_id: websiteId,
    },
    include: {
      llm_responses: true,
    },
  });

  if (!userWebsite || !userWebsite.llm_responses) {
    throw new Error("Audit reports not found for this website.");
  }

  const { brand_audit } = userWebsite.llm_responses;

  // Here you can extend this logic if your DB has separate fields for different reports
  // Currently assuming all reports are stored in brand_audit
  return {
    websiteId,
    brandAudit: brand_audit,
    source: reportType,
  };
};
