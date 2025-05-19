import axios from "axios";
import puppeteer, { Browser } from "puppeteer";
import { PrismaClient } from "@prisma/client";
import { CreateWebsiteAnalysisDto } from "./schema";
import { URL } from "url";
import { BrokenLinkResult } from "../../types/express";

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

export async function checkBrokenLinks(baseUrl: string, maxDepth = 1): Promise<BrokenLinkResult[]> {
  const browser = await puppeteer.launch({ headless: "new" as any });
  const brokenLinks: BrokenLinkResult[] = [];

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
        brokenLinks.push({
          page: pageUrl,
          link: normalized,
          status: result.status,
          error: result.error || "Unknown error",
        });
      }

      if (new URL(normalized).hostname === new URL(baseUrl).hostname && !visited.has(normalized)) {
        internalLinks.push(normalized);
      }
    }

    for (const next of internalLinks) {
      await crawl(next, depth + 1);
    }
  }

  await crawl(baseUrl, 0);
  await browser.close();
  return brokenLinks;
}

export async function getPageSpeedSummary(url: string) {
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

  return {
    url: data.lighthouseResult?.finalUrl,
    fetchedAt: new Date().toISOString(),
    categories: data.lighthouseResult?.categories,
    audits: detailedAuditResults,
  };
}


export const ensureUserWebsiteExists = async (url: string, user_id: string) => {
  let website = await prisma.user_websites.findFirst({
    where: { website_url: url, user_id },
  });

  if (!website) {
    website = await prisma.user_websites.create({
      data: {
        user_id,
        website_url: url,
        website_type: "brand",
        website_name: new URL(url).hostname,
      },
    });
  }

  return website;
};



// export async function savePageSpeedAnalysis(website_id: string, url: string) {
//   const summary = await getPageSpeedSummary(url);

//   const analysis = await prisma.brand_website_analysis.create({
//     data: {
//       website_id,
//       performance_score: summary.categories?.performance?.score != null ? summary.categories.performance.score * 100 : null,
//       seo_score: summary.categories?.seo?.score != null ? summary.categories.seo.score * 100 : null,
//       accessibility_score: summary.categories?.accessibility?.score != null ? summary.categories.accessibility.score * 100 : null,
//       best_practices_score: summary.categories?.["best-practices"]?.score != null ? summary.categories["best-practices"].score * 100 : null,
//       pwa_score: summary.categories?.pwa?.score != null ? summary.categories.pwa.score * 100 : null,
//       created_at: new Date(),
//       updated_at: new Date(),
//     },
//     select: {
//       website_analysis_id: true,  // <-- get the real primary key
//     }
//   });

//   await prisma.pagespeed_audit.createMany({
//     data: summary.audits.map((audit) => ({
//       website_id: website_id,
//       website_analysis_id: analysis.website_analysis_id,  // <-- use the correct id here
//       audit_key: audit.id,
//       title: audit.title,
//       description: audit.description,
//       score: typeof audit.score === "number" ? audit.score : null,
//       display_value: audit.displayValue,
//       details: audit.details,
//       created_at: new Date(),
//       updated_at: new Date(),
//     })),
//   });



//   return analysis;
// }


export async function savePageSpeedAnalysis(website_id: string, url: string) {
  // 1. Get the summary from Google PageSpeed API
  const summary = await getPageSpeedSummary(url);

  // 2. Create the brand_website_analysis record and return the generated primary key
  const analysis = await prisma.brand_website_analysis.create({
    data: {
      website_id,
      performance_score: summary.categories?.performance?.score != null ? summary.categories.performance.score * 100 : null,
      seo_score: summary.categories?.seo?.score != null ? summary.categories.seo.score * 100 : null,
      accessibility_score: summary.categories?.accessibility?.score != null ? summary.categories.accessibility.score * 100 : null,
      best_practices_score: summary.categories?.["best-practices"]?.score != null ? summary.categories["best-practices"].score * 100 : null,
      pwa_score: summary.categories?.pwa?.score != null ? summary.categories.pwa.score * 100 : null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      website_analysis_id: true,  // Make sure to return this field
    },
  });

  // 3. Insert all audit details using the generated website_analysis_id
  await prisma.pagespeed_audit.createMany({
    data: summary.audits.map((audit) => ({
      website_id,
      website_analysis_id: analysis.website_analysis_id, // link audits to analysis record
      audit_key: audit.id,
      title: audit.title,
      description: audit.description,
      score: typeof audit.score === "number" ? audit.score : null,
      display_value: audit.displayValue,
      details: audit.details,
      created_at: new Date(),
      updated_at: new Date(),
    })),
  });

  // 4. Return the created analysis record (with id)
  return analysis;
}
