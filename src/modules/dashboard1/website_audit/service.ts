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

export async function getPageSpeedSummary(user_id: string, website_id: string) {
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

  const response = await axios.get(`${API_URL}?${params}`);
  const data = response.data;

  const audits = data.lighthouseResult?.audits || {};
  const getAudit = (id: string) => {
  const audit = audits[id]; // ✅ directly access from audits
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

const allAuditIds = Object.keys(audits); // ✅ correct
const allAudits = allAuditIds.map(getAudit);
  // const lighthouse = data?.lighthouseResult;
  // const allAuditIds = Object.keys(audits.audits);
  // const allAudits = allAuditIds.map(getAudit);
  const TRUST_AND_SAFETY_IDS = [
    "csp-xss",
    "has-hsts",
    "origin-isolation",
    "clickjacking-mitigation"
  ];

  const detailedAuditResults = Object.keys(audits).map((key) => {
    const audit = audits[key];
    return {
      id: key,
      title: audit.title,
      description: audit.description,
      score: audit.score,
      displayValue: audit.displayValue || null,
      details: audit.details || null,
      scoreDisplayMode: audit.scoreDisplayMode || null,
    };
  });

  const bestPracticeAuditIds = (data.lighthouseResult?.categories?.["best-practices"]?.auditRefs || []).map(
    (ref: any) => ref.id
  );

  const bestPracticeAudits = detailedAuditResults.filter((audit) =>
    bestPracticeAuditIds.includes(audit.id)
  );

  const bestPracticeGroups = {
    trustAndSafety: [] as any[],
    general: [] as any[],
    passed: [] as any[],
    notApplicable: [] as any[],
  };

  for (const audit of bestPracticeAudits) {
    if (TRUST_AND_SAFETY_IDS.includes(audit.id)) {
      bestPracticeGroups.trustAndSafety.push(audit);
    } else if (audit.id === "js-libraries") {
      bestPracticeGroups.general.push(audit); // Always in general
    } else if (audit.scoreDisplayMode === "notApplicable") {
      bestPracticeGroups.notApplicable.push(audit);
    } else if (audit.score === 1) {
      bestPracticeGroups.passed.push(audit);
    } else if (audit.score === 0) {
      bestPracticeGroups.general.push(audit);
    }
  }



  const accessibilityAuditIds = (data.lighthouseResult?.categories?.["accessibility"]?.auditRefs || []).map(
    (ref: any) => ref.id
  );

  const accessibilityAudits = detailedAuditResults.filter((audit) =>
    accessibilityAuditIds.includes(audit.id)
  );

  const userAccessReadiness = {
    critical: [] as any[],
    enhancements: [] as any[],
    passed: [] as any[],
    notApplicable: [] as any[],
  };

  for (const audit of accessibilityAudits) {
    if (audit.scoreDisplayMode === "notApplicable") {
      userAccessReadiness.notApplicable.push(audit);
    } else if (audit.score === 1) {
      userAccessReadiness.passed.push(audit);
    } else if (audit.score === 0) {
      userAccessReadiness.critical.push(audit);
    } else {
      userAccessReadiness.enhancements.push(audit);
    }
  }

  // Extract numeric values for LCP, TBT, CLS
  const LCP = audits["largest-contentful-paint"]?.numericValue || 0;
  const TBT = audits["total-blocking-time"]?.numericValue || 0;
  const CLS = audits["cumulative-layout-shift"]?.numericValue || 0;
  const lcpSeconds = LCP / 1000;
  const seoAuditIds = (data.lighthouseResult?.categories?.seo?.auditRefs || []).map(
    (ref: any) => ref.id
  );

  const seoAudits = detailedAuditResults.filter((audit) =>
    seoAuditIds.includes(audit.id)
  );

  const revenueLossPercent = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10);
  // console.log("seoAudits 1", seoAudits);
  return {
    url: data.lighthouseResult?.finalUrl,
    fetchedAt: new Date().toISOString(),
    categories: data.lighthouseResult?.categories,
    revenueLossPercent: parseFloat(revenueLossPercent.toFixed(2)),
    audits: allAudits,
    bestPracticeGroups,
    userAccessReadiness,
    seoAudits
  };
}


export async function savePageSpeedAnalysis(user_id: string, website_id: string, summary: any) {
  const audits = summary.audits || [];
  // console.log("seoAudits", summary.seoAudits);
  const getAuditValue = (id: string) => {
    const audit = audits.find((a: any) => a.id === id);
    return audit?.displayValue || null;
  };
  //  console.log("audit_details",summary.audit_detail)
  return await prisma.brand_website_analysis.create({
    data: {
      website_id,
      performance_score: summary.categories?.performance?.score != null ? summary.categories.performance.score * 100 : null,
      seo_score: summary.categories?.seo?.score != null ? summary.categories.seo.score * 100 : null,
      accessibility_score: summary.categories?.accessibility?.score != null ? summary.categories.accessibility.score * 100 : null,
      best_practices_score: summary.categories?.["best-practices"]?.score != null ? summary.categories["best-practices"].score * 100 : null,

      // Timing metrics
      first_contentful_paint: getAuditValue("first-contentful-paint"),
      largest_contentful_paint: getAuditValue("largest-contentful-paint"),
      total_blocking_time: getAuditValue("total-blocking-time"),
      speed_index: getAuditValue("speed-index"),
      cumulative_layout_shift: getAuditValue("cumulative-layout-shift"),
      time_to_interactive: getAuditValue("interactive"),

      // Revenue loss
      revenue_loss_percent: summary.revenueLossPercent,

      audit_details: {
        allAudits: summary.audits,
        optimization_opportunities: summary.optimization_opportunities,
        user_access_readiness: summary.userAccessReadiness,
        seoAudits: summary.seoAudits,
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
