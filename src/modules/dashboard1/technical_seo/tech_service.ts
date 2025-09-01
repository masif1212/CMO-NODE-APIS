import puppeteer, { Browser } from "puppeteer";
import { PrismaClient } from "@prisma/client";
// import { CreateWebsiteAnalysisDto } from "./schema";
import { URL } from "url";
import { BrokenLinkResult } from "../../../types/express";

const prisma = new PrismaClient();

const TIMEOUT_MS = 30000;

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
        quickFix: `Double-check the URL for accuracy. If the page was moved, set up a 301 redirect. If it's no longer relevant, remove or replace the link.`,
      };
    case 403:
      return {
        error: `🚫 Error: Access forbidden (403).\nThe link "${url}" is blocking access — likely due to permission settings, firewalls, or bot protection.`,
        quickFix: `Ensure the page is publicly accessible. If it's a protected resource, consider removing the link or replacing it with a public equivalent.`,
      };
    case 500:
      return {
        error: `💥 Error: Internal server error (500).\nThe server hosting "${url}" encountered an error.`,
        quickFix: `Recheck this link later. If it's your own site, investigate server logs. If external, consider reporting it or replacing the link.`,
      };
    case 400:
      return {
        error: `🛑 Error: Bad request (400).\nThe URL "${url}" may be malformed or contain invalid parameters.`,
        quickFix: `Review and correct the URL syntax or remove unnecessary query strings.`,
      };
    case 401:
      return {
        error: `🔐 Error: Unauthorized (401).\nThe page "${url}" requires authentication to access.`,
        quickFix: `Either remove the link, secure it behind login, or replace with a public version.`,
      };
    case 408:
      return {
        error: `⏳ Error: Request timeout (408).\nThe server hosting "${url}" took too long to respond.`,
        quickFix: `Check the server status or reduce request load. Retry later.`,
      };
    case 0:
      return {
        error: `🌐 Error: No response or connection error.\nThe URL "${url}" could not be reached — possibly due to DNS issues, SSL problems, or the site being offline.`,
        quickFix: `Verify the domain is active and check your internet or firewall rules.`,
      };
    default:
      return {
        error: `⚠️ Error: HTTP status ${status} returned.\nThe link "${url}" resulted in an unhandled status code.`,
        quickFix: `Research this status and determine whether to keep, fix, or remove the link.`,
      };
  }
}

export async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
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
export async function checkBrokenLinks(user_id: string, website_id: string, website_url: string, maxDepth = 0): Promise<BrokenLinkResult[]> {
  // Inside checkBrokenLinks function
  console.log("Puppeteer is launching...");

  const launchOptions = {
    executablePath: "/usr/bin/google-chrome-stable",
    headless: "new" as any,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  console.log("Using launch options:", JSON.stringify(launchOptions));
  const browser = await puppeteer.launch(launchOptions);

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

      if (new URL(normalized).hostname === new URL(website_url).hostname && !visited.has(normalized)) {
        internalLinks.push(normalized);
      }
    }

    for (const next of internalLinks) {
      await crawl(next, depth + 1);
    }
  }

  await crawl(website_url, 0);

  await browser.close();
  return brokenLinks;
}
