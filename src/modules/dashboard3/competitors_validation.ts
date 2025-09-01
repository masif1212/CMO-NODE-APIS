import OpenAI from "openai";
import "dotenv/config";
import * as cheerio from "cheerio";
import { promisify } from "util";
import dns from "dns"; // Node.js built-in DNS module
const resolve4 = promisify(dns.resolve4);
import puppeteer, { Browser } from "puppeteer";
import fetch from "node-fetch";
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to replace the p-limit package
function createLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  function next() {
    if (activeCount < concurrency && queue.length > 0) {
      activeCount++;
      const task = queue.shift()!;
      task();
    }
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        } finally {
          activeCount--;
          next();
        }
      };

      queue.push(task);
      if (activeCount < concurrency) {
        next();
      }
    });
  };
}
export function processSeoAudits(auditData: any[]): { passedAudits: { title: string; description: string }[]; failedAudits: { title: string; description: string }[] } {
  const passedAudits: { title: string; description: string }[] = [];
  const failedAudits: { title: string; description: string }[] = [];

  if (!Array.isArray(auditData)) {
    return { passedAudits: [], failedAudits: [] };
  }

  for (const audit of auditData) {
    // Skip the structured-data audit
    if (audit?.id === "structured-data") {
      continue;
    }

    // Define user-friendly titles and descriptions based on audit ID
    let userFriendlyTitle: string;
    let passedDescription: string;
    let failedDescription: string;

    switch (audit?.id) {
      case "is-crawlable":
        userFriendlyTitle = "Search Engines Can Find This Page";
        passedDescription = "Page allows search engines to find and index it, making it visible in search results.";
        failedDescription = "Page is blocked from search engines, which may prevent it from appearing in search results. Check for noindex tags or robots.txt restrictions.";
        break;
      case "document-title":
        userFriendlyTitle = "Page Has a Clear and Useful Title";
        passedDescription = "Page has a title that helps users and search engines understand its content.";
        failedDescription = "Page is missing a title or has an unclear one, which can confuse users and search engines. Add a descriptive title tag.";
        break;
      case "meta-description":
        userFriendlyTitle = "Page Has a Helpful Description";
        passedDescription = "Page includes a short summary that appears in search results, helping users know what it’s about.";
        failedDescription = "Page lacks a meta description, which may reduce click-through rates. Add a concise summary of the Page’s content.";
        break;
      case "http-status-code":
        userFriendlyTitle = "Page Loads Without Errors";
        passedDescription = "Page returns a successful status code, ensuring search engines can access it properly.";
        failedDescription = "Page returns an error status code, preventing search engines from accessing it. Fix server or redirect issues.";
        break;
      case "link-text":
        userFriendlyTitle = "Links Use Clear and Descriptive Text";
        passedDescription = "links use descriptive text, making it easier for users and search engines to understand them.";
        failedDescription = "Some links lack descriptive text , which can confuse users and search engines. Use meaningful link text.";
        break;
      case "crawlable-anchors":
        userFriendlyTitle = "Links Can Be Followed by Search Engines";
        passedDescription = "Links are set up correctly, allowing search engines to explore  website effectively.";
        failedDescription = "Some links are not crawlable due to improper setup (e.g., JavaScript-based links). Ensure links use proper HTML anchor tags.";
        break;
      case "robots-txt":
        userFriendlyTitle = "Robots.txt File Is Set Up Correctly";
        passedDescription = "Robots.txt file is properly configured, guiding search engines on how to crawl  site.";
        failedDescription = "Robots.txt file is missing or incorrectly configured, which may block search engines. Create or fix the robots.txt file.";
        break;
      case "image-alt":
        userFriendlyTitle = "Images Have Descriptive Alt Text";
        passedDescription = "Images include alt text, helping search engines and screen readers understand them.";
        failedDescription = "Some images lack alt text, making them less accessible and harder for search engines to understand. Add descriptive alt text to all images.";
        break;
      case "hreflang":
        userFriendlyTitle = "Page Shows the Right Language to the Right Users";
        passedDescription = "Page correctly specifies its language, helping search engines show it to the right audience.";
        failedDescription = "Page has missing or incorrect language settings, which may show it to the wrong audience. Add correct hreflang tags.";
        break;
      case "canonical":
        userFriendlyTitle = "Page Shows Its Preferred URL";
        passedDescription = "Page uses a canonical link to tell search engines the preferred version, avoiding duplicate content issues.";
        failedDescription = "Page lacks a canonical link, which may cause duplicate content issues. Add a canonical tag to specify the preferred URL.";
        break;
      default:
        userFriendlyTitle = audit?.title || "Unknown Audit";
        passedDescription = audit?.description || "No description available";
        failedDescription = audit?.description || "This audit failed, but no specific guidance is available. Review the page configuration.";
    }

    // Create audit entry
    const auditEntry = {
      title: userFriendlyTitle,
      description: audit?.score === 1 ? passedDescription : failedDescription,
    };

    // Categorize based on score
    if (audit?.score === 1) {
      passedAudits.push(auditEntry);
    } else if (audit?.score === 0) {
      failedAudits.push(auditEntry);
    }
  }

  return { passedAudits, failedAudits };
}

const dnsCache = new Map<string, string[]>();

export async function resolveDnsCached(hostname: string): Promise<string[]> {
  if (dnsCache.has(hostname)) {
    const cached = dnsCache.get(hostname);
    return Array.isArray(cached) ? cached : [];
  }

  try {
    const addresses = await resolve4(hostname);
    dnsCache.set(hostname, addresses);
    return addresses;
  } catch (err) {
    console.warn(`DNS resolve failed for ${hostname}: ${err}`);
    dnsCache.set(hostname, []); // cache negative result
    return [];
  }
}

async function extractMetaRedirect(html: string): Promise<string | null> {
  const $ = cheerio.load(html);
  const meta = $('meta[http-equiv="refresh" i]');
  const content = meta.attr("content");
  if (content) {
    const match = content.match(/url=(.+)/i);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function isHomepagePath(path: string): boolean {
  const normalized = path.replace(/\/+$/, "").toLowerCase() || "/";

  const acceptedHomepagePaths = new Set([
    "/",
    "/home",
    "/index",
    "/welcome",
    "/en",
    "/us",
    "/uk", // common locale codes
  ]);

  return acceptedHomepagePaths.has(normalized) || /^\/(country\/[a-z]{2}|[a-z]{2})$/i.test(normalized);
}

async function checkLandingHomepage(url: string, browser: Browser): Promise<{ valid: boolean; finalUrl?: string }> {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0");

    // Fail fast (lower timeout), and don't wait for all resources
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 110000 });

    let finalUrl = page.url();
    const html = await page.content();

    const metaRedirect = await extractMetaRedirect(html);
    if (metaRedirect) finalUrl = new URL(metaRedirect, url).toString();

    const finalPath = new URL(finalUrl).pathname.replace(/\/+$/, "") || "/";
    return { valid: isHomepagePath(finalPath), finalUrl };
  } catch (err) {
    console.error(`Check failed for ${url}: ${err}`);
    return { valid: false };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        console.warn(`Failed to close page for ${url}:`, err);
      }
    }
  }
}

async function isHttpStatus200(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status === 200;
  } catch (err) {
    console.warn(`Quick status check failed for ${url}:`, err);
    return false;
  }
}

export async function isValidCompetitorUrl(url: string, competitorName?: string, Browser?: Browser): Promise<{ isValid: boolean; preferredUrl?: string; reason?: string }> {
  try {
    if (!/^https?:\/\//.test(url)) {
      return { isValid: false, reason: "URL does not use HTTP or HTTPS" };
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname;

    const blocklist = ["facebook.com", "twitter.com", "google.com", "youtube.com", "instagram.com", "linkedin.com", "tiktok.com", "example.com", "nonexistent.com"];
    if (blocklist.some((b) => hostname.includes(b))) {
      return { isValid: false, reason: `Hostname "${hostname}" is in the blocklist` };
    }

    if (competitorName) {
      const normalizedName = competitorName.toLowerCase().replace(/\s+/g, "");
      if (!hostname.toLowerCase().includes(normalizedName)) {
        return { isValid: false, reason: `Hostname does not include normalized competitor name "${normalizedName}"` };
      }
    }

    // ⚡ Fast HTTP check before launching Puppeteer
    const isLive = await isHttpStatus200(url);
    if (!isLive) {
      return { isValid: false, reason: "Fast HTTP check failed (non-200 or unreachable)" };
    }

    const originalDns = await resolveDnsCached(hostname);
    if (!originalDns.length) {
      const reason = `DNS resolution failed for hostname "${hostname}"`;
      console.warn(reason);
      return { isValid: false, reason };
    }

    if (!Browser) {
      return { isValid: false, reason: "Browser instance is required but not provided" };
    }
    const firstCheck = await checkLandingHomepage(url, Browser);
    if (firstCheck.valid) {
      return { isValid: true, preferredUrl: firstCheck.finalUrl };
    }

    // Try alternate www/non-www version
    const hasWWW = hostname.startsWith("www.");
    const altHostname = hasWWW ? hostname.replace(/^www\./, "") : `www.${hostname}`;
    const altUrl = url.replace(hostname, altHostname);

    const altDns = await resolveDnsCached(altHostname);
    if (!altDns.length) {
      const reason = `Alternate DNS resolution failed for hostname "${altHostname}"`;
      console.warn(reason);
      return { isValid: false, reason };
    }

    const secondCheck = await checkLandingHomepage(altUrl, Browser);
    if (secondCheck.valid) {
      return { isValid: true, preferredUrl: secondCheck.finalUrl };
    }

    return { isValid: false, reason: "Neither original nor alternate URL led to a valid homepage" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Validation failed for ${url}:`, err);
    return { isValid: false, reason: `Unexpected error: ${errorMessage}` };
  } finally {
  }
}

export async function validateCompetitorUrlsInParallel(urls: string[], competitorNames?: (string | undefined)[]): Promise<{ url: string; result: { isValid: boolean; preferredUrl?: string } }[]> {
  // const pLimit = require("p-limit");
  // const limit = pLimit(MAX_CONCURRENT_VALIDATIONS);
  const limit = createLimiter(7); // Use our new helper function
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome-stable",
      headless: "new" as any,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const results = await Promise.all(
      urls.map((url, index) =>
        limit(async () => {
          try {
            const name = competitorNames?.[index];
            // const result = await isValidCompetitorUrl(url, name, browser);
            const result = await isValidCompetitorUrl(url, name, browser ?? undefined);
            return { url, result };
          } catch (err) {
            console.error(`Validation failed for ${url}:`, err);
            return { url, result: { isValid: false } };
          }
        })
      )
    );

    return results;
  } catch (err) {
    console.error("Failed to validate competitor URLs:", err);
    return urls.map((url) => ({ url, result: { isValid: false } }));
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.warn("Failed to close shared browser:", err);
      }
    }
  }
}
