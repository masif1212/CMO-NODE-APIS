import axios from "axios";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();
const API_KEY = process.env.PAGESPEED_API_KEY || "YOUR_KEY";
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
  // console.log(`Fetching URL for user_id: ${user_id}, website_id: ${website_id}`);
  const website = await prisma.user_websites.findUnique({

    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    select: {
      website_url: true,
    },
  });

  if (!website?.website_url) {
    throw new Error(`No URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }

  return website.website_url;
}





export async function getPageSpeedData(user_id: string, website_id: string) {
    const url = await getWebsiteUrlById(user_id, website_id);


  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
    params.append("category", c)
  );

  try {
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouse = data?.lighthouseResult;

    if (!lighthouse?.categories || !lighthouse.audits) {
      throw new Error("Missing Lighthouse categories or audits in response");
    }

    const getScore = (cat: string) =>
      lighthouse.categories[cat]?.score != null
        ? Math.round(lighthouse.categories[cat].score * 100)
        : null;

    const getAudit = (id: string) => {
      const audit = lighthouse.audits[id];
      return audit
        ? {
          id,
          title: audit.title ?? null,
          description: audit.description ?? null,
          display_value: audit.displayValue ?? null,
          score: audit.score ?? null,
          details: audit.details ?? null,
        }
        : {
          id,
          title: null,
          description: null,
          display_value: null,
          score: null,
          details: null,
        };
    };

    // All audits
    const allAuditIds = Object.keys(lighthouse.audits);
    const allAudits = allAuditIds.map(getAudit);

    // Optimization opportunities (e.g., low-score and has details with type = 'opportunity')
    const optimization_opportunities = allAuditIds
      .map((id) => lighthouse.audits[id])
      .filter(
        (audit) =>
          audit.details?.type === "opportunity" &&
          audit.score !== 1 &&
          audit.score !== null
      )
      .map((audit) => getAudit(audit.id));

    // User accessibility-related audits (score < 1 in accessibility category)
    const user_access_readiness = allAuditIds
      .map((id) => lighthouse.audits[id])
      .filter(
        (audit) =>
          audit.score !== 1 &&
          audit.score !== null &&
          audit.score !== undefined &&
          lighthouse.categories["accessibility"]?.auditRefs?.some((ref: any) => ref.id === audit.id)
      )
      .map((audit) => getAudit(audit.id));

    // SEO audits
    const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
    const seoAudits = seoAuditIds.map(getAudit);



  // const LCP = lighthouse?.largest_contentful_paint?.display_value || 'N/A';
  // const TBT = lighthouse?.total_blocking_time?.display_value || 'N/A';
  // const CLS = lighthouse?.cumulative_layout_shift?.display_value || 'N/A';

  const LCP = lighthouse?.audits["largest-contentful-paint"]?.numericValue;
  const TBT = lighthouse?.audits["total-blocking-time"]?.numericValue;
  const CLS = lighthouse?.audits["cumulative-layout-shift"]?.numericValue;

  const lcpSeconds = LCP / 1000;
  // const revenueLossPercent = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10).toFixed(2);
  // const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;
    const rawRevenueLoss = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10);
const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
  const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

    console.log("Revenue Loss Formula:");
    console.log(fullExpression);
    console.log("Revenue Loss Formula:");
    console.log(fullExpression);
  
  // console.log("revenueLossPercent",revenueLossPercent)

    
    return {
      categories: {
        performance: getScore("performance"),
        seo: getScore("seo"),
        accessibility: getScore("accessibility"),
        best_practices: getScore("best-practices"),
        pwa: getScore("pwa"),
      },
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
      audit_details: {
        allAudits: allAudits,
        optimization_opportunities: optimization_opportunities,
        user_access_readiness: user_access_readiness,
        seoAudits: seoAudits,
      },

      revenueLossPercent:revenueLossPercent
    };
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    return null;
  }
}


export async function savePageSpeedAnalysis(user_id: string, website_id: string, mainPageSpeedData: any) {
  const audits = mainPageSpeedData.audits || {};

  const getAuditValue = (id: string) => {
    const audit = audits[id];
    return audit?.display_value || null;
  };

  return await prisma.brand_website_analysis.create({
    data: {
      website_id,

      // Score categories (already percentage from getPageSpeedData)
      performance_score: mainPageSpeedData.categories?.performance ?? null,
      seo_score: mainPageSpeedData.categories?.seo ?? null,
      accessibility_score: mainPageSpeedData.categories?.accessibility ?? null,
      best_practices_score: mainPageSpeedData.categories?.["best-practices"] ?? null,

      // Timing metrics
      first_contentful_paint: getAuditValue("first-contentful-paint"),
      largest_contentful_paint: getAuditValue("largest-contentful-paint"),
      total_blocking_time: getAuditValue("total-blocking-time"),
      speed_index: getAuditValue("speed-index"),
      cumulative_layout_shift: getAuditValue("cumulative-layout-shift"),
      time_to_interactive: getAuditValue("interactive"),

      revenue_loss_percent: mainPageSpeedData.revenueLossPercent,

      // Audit groups
      audit_details: {
        allAudits: mainPageSpeedData.audit_details.allAudits,
        optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
        user_access_readiness: mainPageSpeedData.audit_details.user_access_readiness,
        seoAudits: mainPageSpeedData.audit_details.seoAudits,
      },

      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      website_analysis_id: true,
      revenue_loss_percent: true,
      best_practices_score: true,
    },
  });
}

