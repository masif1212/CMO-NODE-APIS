import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";

const prisma = new PrismaClient();

export interface ScrapeResult {
  success: boolean;
  website_id?: string;
  logo_url?: string;
  status_code?: number;
  status_message?: string;
  ip_address?: string;
  response_time_ms?: number;
  error?: string;
  raw_html?: string; // optional, useful for debugging blockers
}

async function getRobotsTxtAndSitemaps(baseUrl: string): Promise<string[]> {
  try {
    console.log("getRobotsTxtAndSitemaps")
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const { data } = await axios.get(robotsUrl);
    const sitemapUrls: string[] = [];

    for (const line of data.split("\n")) {
      if (line.toLowerCase().startsWith("sitemap:")) {
        const parts = line.split(":");
        const sitemapUrl = parts.slice(1).join(":").trim();
        if (sitemapUrl) sitemapUrls.push(sitemapUrl);
      }
    }

    if (sitemapUrls.length === 0) {
      const guesses = ["/sitemap.xml", "/sitemap_index.xml"];
      for (const guess of guesses) {
        sitemapUrls.push(new URL(guess, baseUrl).href);
      }
    }

    return sitemapUrls;
  } catch {
    return [];
  }
}

async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    console.log("parseSitemap")
    const { data } = await axios.get(sitemapUrl);
    const parsed = await parseStringPromise(data);
    const urls: string[] = [];

    if (parsed.sitemapindex?.sitemap) {
      for (const entry of parsed.sitemapindex.sitemap) {
        if (entry.loc?.[0]) {
          const nestedUrls = await parseSitemap(entry.loc[0]);
          urls.push(...nestedUrls);
        }
      }
    }

    if (parsed.urlset?.url) {
      for (const entry of parsed.urlset.url) {
        if (entry.loc?.[0]) urls.push(entry.loc[0]);
      }
    }

    return urls;
  } catch {
    return [];
  }
}


function evaluateHeadingHierarchy($: cheerio.CheerioAPI): {
  // hasH1: boolean;
  totalHeadings: number;
  // headingLevelsUsed: string[];
  headingOrderUsed: string[];
  hasMultipleH1s: boolean;
  skippedHeadingLevels: boolean;
  reversedHeadingOrder: boolean;
  headingHierarchyIssues: boolean;
  message: string;
} {
  const headings = $("h1, h2, h3, h4, h5, h6");
  const levels: number[] = [];
  const headingOrderUsed: string[] = [];
  const headingLevelsUsed: string[] = [];

  headings.each((_, el) => {
    const tag = $(el)[0].tagName.toLowerCase();
    const level = parseInt(tag.replace("h", ""));
    if (!isNaN(level)) {
      levels.push(level);
      headingOrderUsed.push(tag);
      if (!headingLevelsUsed.includes(tag)) {
        headingLevelsUsed.push(tag);
      }
    }
  });

  const totalHeadings = levels.length;
  const hasH1 = headingLevelsUsed.includes("h1");
  const hasMultipleH1s = levels.filter((l) => l === 1).length > 1;

  // Check for skipped heading levels (e.g., h2 → h4 without h3)
  let skippedHeadingLevels = false;
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const curr = levels[i];
    if (curr - prev > 1) {
      skippedHeadingLevels = true;
      break;
    }
  }

  // Check for reversed order (e.g., h3 before h2)
  let reversedHeadingOrder = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] < levels[i - 1]) {
      reversedHeadingOrder = true;
      break;
    }
  }

  const headingHierarchyIssues =
    !hasH1 || hasMultipleH1s || skippedHeadingLevels || reversedHeadingOrder;

  let message = "Heading structure looks good.";
  if (!hasH1) {
    message = "Missing <h1> tag — every page should have a main heading.";
  } else if (hasMultipleH1s) {
    message = "Multiple <h1> tags found — should only have one main heading.";
  } else if (skippedHeadingLevels) {
    message = "Heading levels are skipped — e.g., <h2> followed by <h4>.";
  } else if (reversedHeadingOrder) {
    message = "Improper heading order — higher-level headings (e.g., <h3>) appear before <h2>.";
  }

  return {
    // hasH1,
    totalHeadings,
    // headingLevelsUsed,
    headingOrderUsed,
    hasMultipleH1s,
    skippedHeadingLevels,
    reversedHeadingOrder,
    headingHierarchyIssues,
    message,
  };
}

async function isLogoUrlValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await axios.head(logoUrl, {
      timeout: 5000,
      validateStatus: () => true // Don't throw on 404/500
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}


async function isCrawlableByLLMBots(baseUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const { data: robotsTxt } = await axios.get(robotsUrl);

    const disallowedAgents = ["*", "GPTBot", "CCBot", "AnthropicBot", "ClaudeBot", "ChatGPT-User", "googlebot"];
    const lines = robotsTxt.split("\n").map((line: string) => line.trim());
    let currentAgent: string | null = null;
    const disallowedMap: Record<string, string[]> = {};

    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        currentAgent = line.split(":")[1].trim();
      } else if (line.toLowerCase().startsWith("disallow:") && currentAgent) {
        const path = line.split(":")[1].trim();
        if (!disallowedMap[currentAgent]) disallowedMap[currentAgent] = [];
        disallowedMap[currentAgent].push(path);
      }
    }

    for (const agent of disallowedAgents) {
      const disallows = disallowedMap[agent];
      if (disallows && disallows.some(path => path === "/" || path === "/*")) {
        return false;
      }
    }

    return true;
  } catch {
    // If robots.txt is missing or can't be fetched, assume crawlable
    return true;
  }
}





export async function scrapeWebsite(user_id: string, url: string): Promise<ScrapeResult> {
  const start = Date.now();
  const domain = new URL(url).hostname;

  let statusCode = 0;
  let ipAddress = "N/A";
  let message = "Unknown error";
  let html = "";

  try {
    const response = await axios.get(url);
    html = response.data;
    statusCode = response.status;
    const dnsResult = await dns.lookup(domain);
    ipAddress = dnsResult.address;
    message = statusCode >= 200 && statusCode < 400 ? "Website is up" : "Website responded with an error";
  } catch (error: any) {
    const code = error?.response?.status || 500;
    const raw = error?.response?.data || "";
    statusCode = code;
    html = typeof raw === "string" ? raw : "";
    let message;
    switch (code) {
      case 404:
        message = "Website not found (404)";
        break;
      case 429:
        message = "Scraping blocked (429)";
        break;
      case 500:
        message = "Internal Server Error (500)";
        break;
      case 403:
        message = "Access denied (403)";
        break;
      default:
        message = `Fetch or DNS error: ${error.message}`;
    }


    return {
      success: false,
      status_code: code,
      
      error: message,
    };
  }

  const responseTimeMs = Date.now() - start;

  const newWebsite = await prisma.user_websites.create({
    data: {
      website_url: url,
      users: { connect: { user_id } },
    },
    select: { website_id: true },
  });

  const websiteId = newWebsite.website_id;
  const $ = cheerio.load(html);
  const headingAnalysis = evaluateHeadingHierarchy($);

  function extractTitleTags(): object {
    const titles = $("title").map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const status = titles.length === 0 ? "not found" : titles.length === 1 ? "ok" : "multiple";
    const message =
      titles.length > 1
        ? `${titles.join(" || ")} - needs attention - multiple title tags found`
        : titles[0] || "not found";
    return { status, titles, message };
  }

  const meta = {
    page_title: extractTitleTags(),
    meta_description: $('meta[name="description"]').attr("content") || "not found",
    meta_keywords: $('meta[name="keywords"]').attr("content") || "not found",
    og_title: $('meta[property="og:title"]').attr("content") || "not found",
    og_description: $('meta[property="og:description"]').attr("content") || "not found",
    og_image: $('meta[property="og:image"]').attr("content") || "not found",
  };

  let twitter, facebook, instagram, linkedin, youtube, tiktok;
  const otherLinks: string[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const link = href.toLowerCase();
    if (link.includes("twitter.com")) twitter ||= href;
    else if (link.includes("facebook.com")) facebook ||= href;
    else if (link.includes("instagram.com")) instagram ||= href;
    else if (link.includes("linkedin.com")) linkedin ||= href;
    else if (link.includes("youtube.com")) youtube ||= href;
    else if (link.includes("tiktok.com")) tiktok ||= href;
    else otherLinks.push(href);
  });

  const totalImages = $("img").length;
  const imagesWithAlt = $("img").filter((_, el) => !!$(el).attr("alt")?.trim()).length;
  const   homepage_alt_text_coverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;



  const sitemapUrls = await getRobotsTxtAndSitemaps(url);
  const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();
  const uniqueUrls = [...new Set<string>([url, ...sitemapLinks.map((u) => u.trim())])];

  let affectedPagesCount = 0;
  const keyPages = await Promise.all(
    uniqueUrls.map(async (pageUrl) => {
      try {
        const res = await axios.get(pageUrl);
        if (res.status >= 200 && res.status < 400) {
          const $$ = cheerio.load(res.data);
          const titles = $$("title").map((_, el) => $$(el).text().trim()).get().filter(Boolean);
          const title =
            titles.length > 1
              ? `${titles.join(" || ")} - needs attention - multiple title tags found`
              : titles[0] || "not found";
          const meta_description = $$('meta[name="description"]').attr("content") || "not found";
          const og_title = $$('meta[property="og:title"]').attr("content") || "not found";
          const meta_keywords = $$('meta[name="keywords"]').attr("content") || "not found";

          const missingAny = !(title && meta_description && og_title && meta_keywords);
          if (missingAny) affectedPagesCount++;

          return { url: pageUrl, title, meta_description, og_title, meta_keywords };
        }
      } catch {
        return null;
      }
    })
  );

  const filteredPages = keyPages
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      url: p.url,
      title: p.title ?? "not found",
      meta_description: p.meta_description ?? "not found",
      og_title: p.og_title ?? null,
      meta_keywords: p.meta_keywords ?? "not found",
    }));

  const totalKeyPages = filteredPages.length;
  const CTR_Loss_Percent = {
    total_key_pages: totalKeyPages,
    total_affected_pages: affectedPagesCount,
    CTR_Loss_Percent: totalKeyPages > 0 ? Number(((affectedPagesCount / totalKeyPages) * 0.37).toFixed(2)) : 0,
    extract_message: sitemapLinks.length > 0 ? "Sitemap found" : "Sitemap not found",
  };

  try {
    const schemaAnalysisData: SchemaOutput = await validateComprehensiveSchema(url, websiteId);
    const isCrawlable = await isCrawlableByLLMBots(url);

// Fallback logo detection if needed
// Step 1: Try to use logo from schema
let finalLogoUrl = schemaAnalysisData.logo ?? null;
console.log("finalLogoUrlfromschema",finalLogoUrl)
if (finalLogoUrl && !(await isLogoUrlValid(finalLogoUrl))) {
  console.log("Schema logo URL is invalid, falling back...");
  finalLogoUrl = null; // Clear it so fallback logic runs
}

// Step 2: If no valid schema logo, try scraping from HTML
if (!finalLogoUrl) {
  const logoSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'img[alt*="logo"]',
    'img[src*="logo"]',
  ];

  const $ = cheerio.load(html);
  for (const selector of logoSelectors) {
    const el = $(selector).first();
    let src = el.attr("href") || el.attr("src");
    if (src) {
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = new URL(src, url).href;

      if (await isLogoUrlValid(src)) {
        finalLogoUrl = src;
        break;
      }
    }
  }

}   
   try { console.log("saving scraped data...")
    const record = await prisma.website_scraped_data.create({
      data: {
        website_id: websiteId,
        website_url: url,
        page_title: JSON.stringify(meta.page_title),
        logo_url: finalLogoUrl,
        meta_description: meta.meta_description,
        meta_keywords: meta.meta_keywords,
        og_title: meta.og_title,
        og_description: meta.og_description,
        og_image: meta.og_image,
        twitter_handle: twitter,
        facebook_handle: facebook,
        instagram_handle: instagram,
        linkedin_handle: linkedin,
        youtube_handle: youtube,
        tiktok_handle: tiktok,
        isCrawlable:isCrawlable,
        headingAnalysis:headingAnalysis,
        ctr_loss_percent: CTR_Loss_Percent,
        sitemap_pages: filteredPages,
        schema_analysis: JSON.stringify(schemaAnalysisData),
        homepage_alt_text_coverage:   homepage_alt_text_coverage,
        other_links: otherLinks.length > 0 ? otherLinks : "not found",
        raw_html: html,
        status_code: statusCode,
        ip_address: ipAddress,
        response_time_ms: responseTimeMs,
        status_message: message,
      },
    });
    console.log("scraped data saved")
    return {
      success: true,
      website_id: record.website_id,
      logo_url: record.logo_url ?? undefined,
    };
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
