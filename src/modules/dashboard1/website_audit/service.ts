import axios from "axios";
import { PrismaClient } from "@prisma/client";
// Note: chrome-launcher is also often better when imported dynamically with lighthouse.
import chromeLauncher from "chrome-launcher";
import puppeteer from "puppeteer";

const prisma = new PrismaClient();
const API_KEY = process.env.PAGESPEED_API_KEY || "YOUR_KEY";
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Fetches a website URL from the database based on user and website IDs.
 * @param user_id - The ID of the user.
 * @param website_id - The ID of the website.
 * @returns The URL of the website.
 */
async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
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

const mobileFriendlyAudits = ["viewport", "font-size", "tap-targets", "mobile-friendly"];

export async function getPageSpeedData(user_id: string, website_id: string) {
  const url = await getWebsiteUrlById(user_id, website_id);
  console.log("url fetch", url);
  const API_KEY = process.env.PAGESPEED_API_KEY || "";
  const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) => params.append("category", c));

  // Helper function to process Lighthouse results
  const processLighthouseResult = (lighthouseResult: any) => {
    if (!lighthouseResult?.categories || !lighthouseResult.audits) {
      throw new Error("Missing Lighthouse categories or audits in response");
    }

    const getScore = (cat: string) => (lighthouseResult.categories[cat]?.score != null ? Math.round(lighthouseResult.categories[cat].score * 100) : null);

    const getAudit = (id: string) => {
      const audit = lighthouseResult.audits[id];
      return audit
        ? {
            id,
            title: audit.title || "Unnamed audit",
            description: audit.description ?? null,
            display_value: audit.displayValue ?? null,
            score: audit.score ?? null,
            details: audit.details ?? null,
            scoreDisplayMode: audit.scoreDisplayMode ?? null,
          }
        : {
            id,
            title: "Unnamed audit",
            description: null,
            display_value: null,
            score: null,
            details: null,
            scoreDisplayMode: null,
          };
    };

    const allAuditIds = Object.keys(lighthouseResult.audits);
    const detailedAuditResults = allAuditIds.map(getAudit);

    const accessibilityAuditIds = lighthouseResult.categories["accessibility"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const accessibilityAudits = detailedAuditResults.filter((audit) => accessibilityAuditIds.includes(audit.id));

    const mobileFriendliness = mobileFriendlyAudits.map(getAudit);

    // --- Friendly accessibility mappings and types ---
    type AccessibilityGroupKey = "critical" | "enhancements" | "passed" | "notApplicable";

    type AccessibilityStatus = "critical" | "recommended" | "passed" | "notApplicable";

    const customAccessibilityContent: Record<string, { title: string; description: string }> = {
      "color-contrast": { title: "Text has sufficient color contrast", description: "Text should have enough contrast against its background to be easily readable by everyone, including users with visual impairments." },
      "image-alt": { title: "Images have meaningful alt text", description: "Images should include descriptive alt text to support screen readers and make content accessible to all users." },
      "link-name": { title: "Links use descriptive text", description: "Links should clearly describe their destination or purpose so that all users, including those using assistive technology, can understand them." },
      label: { title: "Form inputs have associated labels", description: "Each form input should have a clear, descriptive label to help users understand the purpose of the field." },
      "document-title": { title: "Page includes a descriptive title", description: "A descriptive page title improves screen reader navigation and helps users understand the purpose of the page." },
      "html-has-lang": { title: "Page has a language attribute set", description: "Defining a language helps screen readers pronounce the content correctly, improving accessibility for multilingual users." },
    };

    const classifyAccessibilityAudit = (
      audit: any
    ): {
      group: AccessibilityGroupKey;
      friendlyTitle: string;
      friendlyDescription: string;
      status: AccessibilityStatus;
    } => {
      const content = customAccessibilityContent[audit.id];
      const friendlyTitle = content?.title || audit.title || "Unnamed Audit";
      const friendlyDescription = content?.description || audit.description || null;

      let group: AccessibilityGroupKey;
      let status: AccessibilityStatus;

      if (audit.scoreDisplayMode === "notApplicable") {
        group = "notApplicable";
        status = "notApplicable";
      } else if (audit.score === 1) {
        group = "passed";
        status = "passed";
      } else if (audit.score === 0) {
        group = "critical";
        status = "critical";
      } else {
        group = "enhancements";
        status = "recommended";
      }

      return {
        group,
        friendlyTitle,
        friendlyDescription,
        status,
      };
    };

    const user_access_readiness: Record<AccessibilityGroupKey, any[]> = {
      critical: [],
      enhancements: [],
      passed: [],
      notApplicable: [],
    };

    for (const audit of accessibilityAudits) {
      const { group, friendlyTitle, friendlyDescription, status } = classifyAccessibilityAudit(audit);

      user_access_readiness[group].push({
        ...audit,
        title: friendlyTitle,
        description: friendlyDescription,
        status,
      });
    }

    // SEO audits
    const seoAuditIds = lighthouseResult.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
    const seoAudits = seoAuditIds.map(getAudit);

    // Best practices
    const TRUST_AND_SAFETY_IDS = ["is-on-https", "uses-http2", "x-content-type-options", "x-frame-options", "xss-protection", "bypass"];

    const bestPracticeAuditIds = lighthouseResult.categories?.["best-practices"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const bestPracticeAudits = detailedAuditResults.filter((audit) => bestPracticeAuditIds.includes(audit.id));

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
        bestPracticeGroups.general.push(audit);
      } else if (audit.scoreDisplayMode === "notApplicable") {
        bestPracticeGroups.notApplicable.push(audit);
      } else if (audit.score === 1) {
        bestPracticeGroups.passed.push(audit);
      } else if (audit.score === 0) {
        bestPracticeGroups.general.push(audit);
      }
    }

    // Revenue loss estimation
    const LCP = lighthouseResult?.audits["largest-contentful-paint"]?.numericValue;
    const TBT = lighthouseResult?.audits["total-blocking-time"]?.numericValue;
    const CLS = lighthouseResult?.audits["cumulative-layout-shift"]?.numericValue;

    const lcpSeconds = LCP / 1000;
    const rawRevenueLoss = (lcpSeconds - 2.5) * 7 + ((TBT - 200) / 100) * 3 + CLS * 10;
    const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
    const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

    console.log("Revenue Loss Formula:", fullExpression);

    return {
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
      audit_details: {
        allAudits: detailedAuditResults,
        optimization_opportunities: bestPracticeGroups,
        user_access_readiness,
        seoAudits,
        categoryScores: {
          performance: getScore("performance"),
          seo: getScore("seo"),
          accessibility: getScore("accessibility"),
          best_practices: getScore("best-practices"),
          mobileFriendliness: mobileFriendliness,
        },
      },
      revenueLossPercent,
    };
  };

  // Try PageSpeed API first
  try {
    console.log("pagespeed api called");
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouseResult = data?.lighthouseResult;

    return processLighthouseResult(lighthouseResult);
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    const mode = process.env.MODE;
    console.log("");

    // Fallback to direct Lighthouse run
    try {
      // **FIX**: Dynamically import lighthouse here, within this scope.
      const { default: lighthouse } = await import("lighthouse");
      let browser;

      if (mode === "production") {
        const launchOptions = {
          executablePath: "/usr/bin/google-chrome-stable",
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        };

        console.log("[brandprofile] Launching Puppeteer with full browser for Cloud Run...");
        browser = await puppeteer.launch(launchOptions);
      } else if (mode === "development") {
        const localLaunchOptions = {
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        };

        console.log("[brandprofile] Launching Puppeteer in headless mode for local environment...");
        browser = await puppeteer.launch(localLaunchOptions);
      } else {
        console.error(`[brandprofile] ERROR: Invalid MODE '${mode}'. Expected 'production' or 'development'.`);
        throw new Error(`Invalid MODE: ${mode}. Expected 'cloud' or 'development'.`);
      }

      console.log("[brandprofile] Puppeteer browser launched successfully.");

      const lighthouseConfig = {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["performance", "seo", "accessibility", "best-practices", "pwa"],
        },
      };

      const result = await lighthouse(
        url,
        {
          port: parseInt(new URL(browser.wsEndpoint()).port), // Convert string to number
          output: "json",
          logLevel: "info",
        },
        lighthouseConfig
      );

      if (!result?.lhr) {
        throw new Error("Lighthouse run did not return valid results");
      }

      await browser.close();
      return processLighthouseResult(result.lhr);
    } catch (lighthouseErr: any) {
      console.error(`Lighthouse fallback failed for ${url}:`, lighthouseErr.message);
      return null;
    }
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
      // Score categories (already percentage from getPageSpeedData)
      performance_score: mainPageSpeedData.audit_details.categoryScores?.performance ?? null,
      seo_score: mainPageSpeedData.audit_details.categoryScores?.seo ?? null,
      accessibility_score: mainPageSpeedData.audit_details.categoryScores?.accessibility ?? null,
      best_practices_score: mainPageSpeedData.audit_details.categoryScores?.["best-practices"] ?? null,

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
        categoryScores: mainPageSpeedData.audit_details.categoryScores,
        optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
        user_access_readiness: mainPageSpeedData.audit_details.user_access_readiness,
        seoAudits: mainPageSpeedData.audit_details.seoAudits,
        audits: mainPageSpeedData.audit_details.audits,
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
