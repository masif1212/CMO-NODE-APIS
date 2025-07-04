import axios from "axios";
import puppeteer, { Browser } from "puppeteer";
import { PrismaClient } from "@prisma/client";
import { CreateWebsiteAnalysisDto } from "./schema";
import { URL } from "url";
import { BrokenLinkResult } from "../../../types/express";

const prisma = new PrismaClient();
const API_KEY = process.env.PAGESPEED_API_KEY || "YOUR_KEY";
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 10000;

const excludedDomains = [
  "mailto:",
  "tel:",
  "wa.me",
  "web.whatsapp.com",
  "api.whatsapp.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "t.me",
  "youtube.com",
  "pinterest.com",
  "snapchat.com",
  "threads.net",
  "x.com",
  "g.page",
  "maps.google.com",
  "plus.google.com",
  "goo.gl",
  "google.com/maps",
  "messenger.com",
];

const visited = new Set<string>();
const checkedLinks = new Set<string>();

function isExcluded(link: string): boolean {
  return excludedDomains.some((domain) => link.toLowerCase().includes(domain));
}

async function fetchWithTimeout(url: string, timeout = TIMEOUT_MS): Promise<{ status: number | string; ok: boolean; error: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (res.status === 405) {
      res = await fetch(url, { method: "GET", signal: controller.signal });
    }
    clearTimeout(timeoutId);
    return { status: res.status, ok: res.ok, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      status: err.name === "AbortError" ? "TIMEOUT" : "ERROR",
      ok: false,
      error: err.name,
    };
  }
}

async function extractLinks(pageUrl: string, browser: Browser): Promise<string[]> {
  const page = await browser.newPage();
  await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });
  const links = await page.$$eval("a[href]", (anchors) => anchors.map((a) => a.href).filter((href) => href && !href.startsWith("javascript:") && !href.startsWith("#")));
  await page.close();
  return [...new Set(links)];
}

function getErrorMessage(status: number, url: string): { error: string; quickFix: string } {
  switch (status) {
    case 404:
      return {
        error: `🔍 Error: Page not found (404).\nThe link "${url}" points to a page that does not exist.`,
        quickFix: `Double-check the URL for accuracy. If the page was moved, set up a 301 redirect. If it's no longer relevant, remove or replace the link.`
      };
    case 403:
      return {
        error: `🚫 Error: Access forbidden (403).\nThe link "${url}" is blocking access — likely due to permission settings, firewalls, or bot protection.`,
        quickFix: `Ensure the page is publicly accessible. If it's a protected resource, consider removing the link or replacing it with a public equivalent.`
      };
    case 500:
      return {
        error: `💥 Error: Internal server error (500).\nThe server hosting "${url}" encountered an error.`,
        quickFix: `Recheck this link later. If it's your own site, investigate server logs. If external, consider reporting it or replacing the link.`
      };
    case 400:
      return {
        error: `🛑 Error: Bad request (400).\nThe URL "${url}" may be malformed or contain invalid parameters.`,
        quickFix: `Review and correct the URL syntax or remove unnecessary query strings.`
      };
    case 401:
      return {
        error: `🔐 Error: Unauthorized (401).\nThe page "${url}" requires authentication to access.`,
        quickFix: `Either remove the link, secure it behind login, or replace with a public version.`
      };
    case 408:
      return {
        error: `⏳ Error: Request timeout (408).\nThe server hosting "${url}" took too long to respond.`,
        quickFix: `Check the server status or reduce request load. Retry later.`
      };
    case 0:
      return {
        error: `🌐 Error: No response or connection error.\nThe URL "${url}" could not be reached — possibly due to DNS issues, SSL problems, or the site being offline.`,
        quickFix: `Verify the domain is active and check your internet or firewall rules.`
      };
    default:
      return {
        error: `⚠️ Error: HTTP status ${status} returned.\nThe link "${url}" resulted in an unhandled status code.`,
        quickFix: `Research this status and determine whether to keep, fix, or remove the link.`
      };
  }
}
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

export async function checkBrokenLinks(
  user_id: string,
  website_id: string,
  maxDepth = 0
): Promise<BrokenLinkResult[]> {
  // Step 1: Verify website ownership before proceeding
  const userWebsite = await prisma.user_websites.findFirst({
    where: { user_id, website_id },
  });

  if (!userWebsite) {
    throw new Error("Website does not belong to the user.");
  }

  // Step 2: Get base URL safely (assuming this also verifies the website)
  const baseUrl = await getWebsiteUrlById(user_id, website_id);

  // Puppeteer browser and sets for tracking
  const browser = await puppeteer.launch({ headless: "new" as any });
  const brokenLinks: BrokenLinkResult[] = [];
  const visited = new Set<string>();
  const checkedLinks = new Set<string>();

  // Recursive crawl function
  async function crawl(pageUrl: string, depth: number) {
    if (visited.has(pageUrl) || depth > maxDepth) return;
    visited.add(pageUrl);

    let links: string[];
    try {
      links = await extractLinks(pageUrl, browser);
    } catch (e: any) {
      console.error(`Error rendering ${pageUrl}: ${e.message}`);
      return;
    }

    const internalLinks: string[] = [];
    for (const link of links) {
      const normalized = link.split("#")[0];
      if (isExcluded(normalized) || checkedLinks.has(normalized)) continue;

      checkedLinks.add(normalized);

      const result = await fetchWithTimeout(normalized);
      if (!result.ok) {
        const { error, quickFix } = getErrorMessage(Number(result.status), normalized);

        brokenLinks.push({
          page: pageUrl,
          link: normalized,
          status: result.status,
          error,
          quickFix,
        });
      }

      if (
        new URL(normalized).hostname === new URL(baseUrl).hostname &&
        !visited.has(normalized)
      ) {
        internalLinks.push(normalized);
      }
    }

    for (const next of internalLinks) {
      await crawl(next, depth + 1);
    }
  }

  // Step 3: Start crawling from baseUrl
  await crawl(baseUrl, 0);

  await browser.close();
  return brokenLinks;
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

  const revenueLossPercent = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10);

  return {
    url: data.lighthouseResult?.finalUrl,
    fetchedAt: new Date().toISOString(),
    categories: data.lighthouseResult?.categories,
    revenueLossPercent: parseFloat(revenueLossPercent.toFixed(2)),
    audits: detailedAuditResults,
    bestPracticeGroups,
    userAccessReadiness,
  };
}

export async function savePageSpeedAnalysis(user_id: string, website_id: string, summary: any) {
  const audits = summary.audits || [];

  const getAuditValue = (id: string) => {
    const audit = audits.find((a: any) => a.id === id);
    return audit?.displayValue || null;
  };

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
        optimization_opportunities: summary.bestPracticeGroups,
        user_access_readiness: summary.userAccessReadiness,
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
