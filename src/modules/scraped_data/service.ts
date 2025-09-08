import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";
import { getDomainRoot,fetchSocialLinksFromDom } from "../../utils/extractDomain"
import puppeteer from "puppeteer";
// const mode = process.env.MODE;

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
  raw_html?: string;
  scraped_data_id?: string;
}

export function evaluateHeadingHierarchy($: cheerio.CheerioAPI): {
  totalHeadings: number;
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

  const headingHierarchyIssues = !hasH1 || hasMultipleH1s || skippedHeadingLevels || reversedHeadingOrder;

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

export async function isLogoUrlValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await axios.head(logoUrl, {
      timeout: 20000,
      validateStatus: () => true, // Don't throw on 404/500
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function isCrawlableByLLMBots(baseUrl: string): Promise<boolean> {
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
      if (disallows && disallows.some((path) => path === "/" || path === "/*")) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}

export async function getRobotsTxtAndSitemaps(baseUrl: string): Promise<string[]> {
  try {
    // console.log("getRobotsTxtAndSitemaps")
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

export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    // console.log("parseSitemap")
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

export function getStatusMessage(code: number): string {
  const messages: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized - Authentication required",
    402: "Payment Required",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot 🍵",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",
    403: "Access denied",
    404: "Page not found",
    429: "Scraping blocked",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
    521: "Web server is down",
    522: "Webside is down",
    523: "Origin is unreachable",
    524: "A timeout occurred",
    525: "SSL handshake failed",
    526: "Invalid SSL certificate",
  };
  if (messages[code]) return messages[code];
  if (code >= 500 && code <= 599) return `Server error (${code})`;
  if (code >= 400 && code <= 499) return `Client error (${code})`;
  return `status code (${code})`;
}

/** ✅ Always return { html, status } */
async function fetchFullHtml(url: string): Promise<{ html: string; status: number }> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let status = 0;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = response?.status() || 0;

    const html = await page.content();
    return { html: html || "", status };
  } catch {
    return { html: "", status: 500 };
  } finally {
    await browser.close();
  }
}

export async function scrapeWebsite(
  user_id: string,
  website_id: string,
  report_id: string
): Promise<any> {
  const start = Date.now();
  const website_url = await getWebsiteUrlById(user_id, website_id);
  const domain = getDomainRoot(website_url);
  const website_name = domain.split(".")[0];

  console.log("website_name", website_name);

  let statusCode = 0;
  let ipAddress = "N/A";
  let html = "";
  let message = "Unknown error";

  try {
    // Puppeteer fetch
    const { html: fetchedHtml, status: fetchedStatus } = await fetchFullHtml(website_url);

    html = typeof fetchedHtml === "string" ? fetchedHtml : "";
    statusCode = fetchedStatus || 200;
    message = getStatusMessage(statusCode);

    // DNS lookup
    try {
      const dnsResult = await dns.lookup(domain);
      ipAddress = dnsResult.address;
    } catch {
      ipAddress = "N/A";
    }
  } catch (error: any) {
    statusCode = error?.statusCode || error?.response?.status || 500;
    html = "";
    message = getStatusMessage(statusCode);

    console.error("Error fetching website:", {
      url: website_url,
      statusCode,
      message,
      error: error.message || error.toString(),
    });
  }

  const responseTimeMs = Date.now() - start;

  // 🔧 Always give cheerio a safe string
  if (typeof html !== "string") html = "";
  const $ = cheerio.load(html || "");

  /** ============ ANALYSIS SECTION ============ */

  const headingAnalysis = evaluateHeadingHierarchy($);

  function extractTitleTags() {
    const titles = $("title")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

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

    /** --- Social Media Links --- */
  let twitter: any, facebook: any, instagram: any, linkedin: any, youtube: any, tiktok: any;
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

  // 🔑 Fallback: use Puppeteer DOM evaluation if no social links were found
  if (!twitter && !facebook && !instagram && !linkedin && !youtube && !tiktok) {
    try {
      const socialLinks = await fetchSocialLinksFromDom(website_url);
      twitter = socialLinks.twitter || twitter;
      facebook = socialLinks.facebook || facebook;
      instagram = socialLinks.instagram || instagram;
      linkedin = socialLinks.linkedin || linkedin;
      youtube = socialLinks.youtube || youtube;
      tiktok = socialLinks.tiktok || tiktok;
    } catch (err) {
      console.warn("Fallback social media extraction failed:", (err as Error).message);
    }
  }


  /** --- Image Alt Coverage --- */
  const totalImages = $("img").length;
  const imagesWithAlt = $("img").filter((_, el) => !!$(el).attr("alt")?.trim()).length;
  const homepage_alt_text_coverage =
    totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;

  /** --- Sitemap --- */
  const sitemapUrls = await getRobotsTxtAndSitemaps(website_url);
  const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();
  const allSitemapUrls = [...new Set([website_url, ...sitemapLinks.map((u) => u.trim())])];

  /** --- Key Pages Selection --- */
  let selectedKeyPages: string[] = [];
  if (allSitemapUrls.length > 10) {
    const homepage = website_url;
    const importantKeywords = [
      "about",
      "services",
      "service",
      "contact",
      "pricing",
      "plans",
      "blog",
      "insights",
      "team",
      "company",
      "features",
      "why",
      "how-it-works",
      "careers",
    ];

    const keywordMatched = allSitemapUrls.filter((link) => {
      try {
        const path = new URL(link).pathname.toLowerCase();
        return importantKeywords.some((kw) => path.includes(kw));
      } catch {
        return false;
      }
    });

    const shallowPages = allSitemapUrls.filter((link) => {
      try {
        const path = new URL(link).pathname;
        const segments = path.split("/").filter(Boolean);
        return segments.length === 1;
      } catch {
        return false;
      }
    });

    selectedKeyPages = [homepage, ...keywordMatched, ...shallowPages]
      .filter((v, i, self) => self.indexOf(v) === i)
      .slice(0, 10);
  } else {
    selectedKeyPages = allSitemapUrls;
  }

  /** --- Key Page Metadata Analysis --- */
  let affectedPagesCount = 0;
  const keyPages = await Promise.all(
    selectedKeyPages.map(async (pageUrl) => {
      try {
        const res = await axios.get(pageUrl);
        if (res.status >= 200 && res.status < 400) {
          const $$ = cheerio.load(res.data);
          const titles = $$("title")
            .map((_, el) => $$(el).text().trim())
            .get()
            .filter(Boolean);

          const title =
            titles.length > 1
              ? `${titles.join(" || ")} - needs attention - multiple title tags found`
              : titles[0] || "not found";

          const meta_description =
            $$('meta[name="description"]').attr("content")?.trim() || "not found";
          const og_title = $$('meta[property="og:title"]').attr("content")?.trim() || "not found";
          const meta_keywords =
            $$('meta[name="keywords"]').attr("content")?.trim() || "not found";

          const isMultipleTitle = title.includes("needs attention");
          const isMissing =
            [title, meta_description, og_title, meta_keywords].some(
              (v) => !v || v.trim().toLowerCase() === "not found"
            ) || isMultipleTitle;

          if (isMissing) affectedPagesCount++;

          return { url: pageUrl, title, meta_description, og_title, meta_keywords };
        }
      } catch (err: any) {
        console.warn("Error fetching key page:", pageUrl, err.message);
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
    CTR_Loss_Percent:
      totalKeyPages > 0
        ? Number(((affectedPagesCount / totalKeyPages) * 0.37).toFixed(2))
        : 0,
    extract_message: sitemapLinks.length > 0 ? "Sitemap found" : "Sitemap not found",
  };

  /** --- Schema + Logo + Crawlability --- */
  const schemaAnalysisData: SchemaOutput = await validateComprehensiveSchema(website_url);
  const isCrawlable = await isCrawlableByLLMBots(website_url);

  let finalLogoUrl = schemaAnalysisData.logo ?? null;
  if (finalLogoUrl && !(await isLogoUrlValid(finalLogoUrl))) {
    finalLogoUrl = null;
  }

  if (!finalLogoUrl) {
    const logoSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'img[alt*="logo"]',
      'img[src*="logo"]',
    ];

    for (const selector of logoSelectors) {
      const el = $(selector).first();
      let src = el.attr("href") || el.attr("src");
      if (src) {
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = new URL(src, website_url).href;

        if (await isLogoUrlValid(src)) {
          finalLogoUrl = src;
          break;
        }
      }
    }
  }

  const h1Text = $("h1").first().text().trim() || "Not Found";

  /** --- Save to DB (race-safe upsert) --- */
  async function upsertWebsiteScrapedDataWithRetry(maxRetries = 3) {
    const payload = {
      website_url,
      H1_text: h1Text,
      website_name,
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
      isCrawlable,
      headingAnalysis,
      ctr_loss_percent: CTR_Loss_Percent,
      sitemap_pages: filteredPages,
      schema_analysis: JSON.stringify(schemaAnalysisData),
      homepage_alt_text_coverage,
      other_links: otherLinks.length > 0 ? otherLinks : "not found",
      raw_html: html,
      status_code: statusCode,
      ip_address: ipAddress,
      response_time_ms: responseTimeMs,
      status_message: message,
    } as const;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await prisma.website_scraped_data.update({
          where: { report_id },
          data: payload,
        });
      } catch (e: any) {
        if (typeof e === "object" && e?.code === "P2025") {
          try {
            return await prisma.website_scraped_data.create({
              data: { report_id, ...payload },
            });
          } catch (e2: any) {
            if (typeof e2 === "object" && e2?.code === "P2002") {
              const backoffMs = 25 * attempt * attempt;
              await new Promise((r) => setTimeout(r, backoffMs));
              continue;
            }
            throw e2;
          }
        }
        throw e;
      }
    }
    return prisma.website_scraped_data.update({
      where: { report_id },
      data: payload,
    });
  }

    await prisma.user_requirements.upsert({
      where: {
        website_id,
      },
      update: {
        facebook_handle: facebook,
        instagram_handle: instagram,
        youtube_handle: youtube,
        tiktok_handle: tiktok,
        twitter_handle: twitter,
        linkedin_handle: linkedin,
      },
      create: {
        user_id,
        website_id,
        facebook_handle: facebook,
        instagram_handle: instagram,
        youtube_handle: youtube,
        tiktok_handle: tiktok,
        twitter_handle: twitter,
        linkedin_handle: linkedin,
      },
    });
  const record = await upsertWebsiteScrapedDataWithRetry();
  
  return {
    success: true,
    logo_url: record.logo_url ?? undefined,
    status_code: statusCode,
    status_message: message,
    scraped_data_id: record.scraped_data_id,
    social_media_handlers: {
      facebook_handle: record.facebook_handle,
      instagram_handle: record.instagram_handle,
      youtube_handle: record.youtube_handle,
    },
    onpage_opptimization: {
      logo_url: record.logo_url ?? undefined,
      h1_text: h1Text,
      metaDataWithoutRawHtml: {
        homepage_alt_text_coverage: record.homepage_alt_text_coverage,
        meta_description: record.meta_description,
        meta_keywords: record.meta_keywords,
        page_title: record.page_title,
        ctr_loss_percent: record.ctr_loss_percent,
        og_title: record.og_title,
        og_description: record.og_description,
        og_image: record.og_image,
      },
    },
  };
}
