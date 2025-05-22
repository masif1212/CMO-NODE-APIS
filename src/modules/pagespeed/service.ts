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


// export async function checkBrokenLinks(website_id: string, maxDepth = 1): Promise<BrokenLinkResult[]> {
//   const browser = await puppeteer.launch({ headless: "new" as any });
//   const brokenLinks: BrokenLinkResult[] = [];

//   async function crawl(pageUrl: string, depth: number) {
//     if (visited.has(pageUrl) || depth > maxDepth) return;
//     visited.add(pageUrl);

//     let links: string[];
//     try {
//       links = await extractLinks(pageUrl, browser);
//     } catch (e: any) {
//       console.error(`Error rendering ${pageUrl}: ${e.message}`);
//       return;
//     }

//     const internalLinks: string[] = [];
//     for (const link of links) {
//       const normalized = link.split("#")[0];
//       if (isExcluded(normalized) || checkedLinks.has(normalized)) continue;

//       checkedLinks.add(normalized);
    

//       const result = await fetchWithTimeout(normalized);
//       if (!result.ok) {
//         const { error, quickFix } = getErrorMessage(Number(result.status), normalized);

//         brokenLinks.push({
//           page: pageUrl,
//           link: normalized,
//           status: result.status,
//           error,
//           quickFix
//         });
//       }




//       if (new URL(normalized).hostname === new URL(baseUrl).hostname && !visited.has(normalized)) {
//         internalLinks.push(normalized);
//       }
//     }

//     for (const next of internalLinks) {
//       await crawl(next, depth + 1);
//     }
//   }

//   await crawl(baseUrl, 0);
//   await browser.close();
//   return brokenLinks;
// }

// export async function getPageSpeedSummary(website_id: string) {
//   const params = new URLSearchParams({
//     url,
//     key: API_KEY,
//     strategy: "desktop",
//     cacheBust: Date.now().toString(),
//   });

//   ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
//     params.append("category", c)
//   );

//   const response = await axios.get(`${API_URL}?${params}`);
//   const data = response.data;

//   const audits = data.lighthouseResult?.audits || {};
//   const detailedAuditResults = Object.keys(audits).map((key) => {
//     const audit = audits[key];
//     return {
//       id: key,
//       title: audit.title,
//       description: audit.description,
//       score: audit.score,
//       displayValue: audit.displayValue || null,
//       details: audit.details || null,
//       scoreDisplayMode: audit.scoreDisplayMode || null,
//     };
//   });

//   return {
//     url: data.lighthouseResult?.finalUrl,
//     fetchedAt: new Date().toISOString(),
//     categories: data.lighthouseResult?.categories,
//     audits: detailedAuditResults,
//   };
// }

async function getWebsiteUrlById(website_id: string): Promise<string> {
  const website = await prisma.user_websites.findUnique({
    where: { website_id: website_id },
    select: { website_url: true },
  });

  if (!website || !website.website_url) {
    throw new Error(`No URL found for website_id: ${website_id}`);
  }

  return website.website_url;
}


export async function checkBrokenLinks(website_id: string, maxDepth = 1): Promise<BrokenLinkResult[]> {
  const baseUrl = await getWebsiteUrlById(website_id);
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
        const { error, quickFix } = getErrorMessage(Number(result.status), normalized);

        brokenLinks.push({
          page: pageUrl,
          link: normalized,
          status: result.status,
          error,
          quickFix
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

export async function getPageSpeedSummary(website_id: string) {
  const url = await getWebsiteUrlById(website_id);

  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best_practices", "pwa"].forEach((c) =>
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


export async function savePageSpeedAnalysis(website_id: string, summary: any) {
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
  // await prisma.pagespeed_audit.createMany({
  //   data: summary.audits.map((audit) => ({
  //     website_id,
  //     website_analysis_id: analysis.website_analysis_id, // link audits to analysis record
  //     audit_key: audit.id,
  //     title: audit.title,
  //     description: audit.description,
  //     score: typeof audit.score === "number" ? audit.score : null,
  //     display_value: audit.displayValue,
  //     details: audit.details,
  //     created_at: new Date(),
  //     updated_at: new Date(),
  //   })),
  // });
  await prisma.pagespeed_audit.createMany({
  data: summary.audits.map((audit: {
    id: string;
    title: string;
    description: string;
    score: number | null;
    displayValue?: string | null;
    details?: any;
  }) => ({
    website_id,
    website_analysis_id: analysis.website_analysis_id,
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
