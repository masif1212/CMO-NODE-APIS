import axios from "axios";
import puppeteer, { Browser } from "puppeteer";

import { URL } from "url";
import { BrokenLinkResult } from "../../types/express";

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
  ["performance", "seo", "accessibility"].forEach((c) => params.append("category", c));

  const response = await axios.get(`${API_URL}?${params}`);
  const data = response.data;

  const audits = data.lighthouseResult?.audits || {};
  const categories = data.lighthouseResult?.categories || {};

  return {
    "Performance Score": categories.performance?.score * 100 || "N/A",
    "SEO Score": categories.seo?.score * 100 || "N/A",
    "Missing Image Alts": audits["image-alt"]?.details?.items?.length || 0,
    "First Contentful Paint": audits["first-contentful-paint"]?.displayValue || "N/A",
    "Largest Contentful Paint": audits["largest-contentful-paint"]?.displayValue || "N/A",
    "Total Blocking Time": audits["total-blocking-time"]?.displayValue || "N/A",
    "Speed Index": audits["speed-index"]?.displayValue || "N/A",
    "Cumulative Layout Shift": audits["cumulative-layout-shift"]?.displayValue || "N/A",
    "Time to Interactive": audits["interactive"]?.displayValue || "N/A",
  };
}
