import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";

const prisma = new PrismaClient();

interface ScrapedMetaData {
  page_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
}

// interface ScrapeResult {
//   website_id: string;
//   logo_url: string | undefined;
//   // record: any;
// }

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




// export async function scrapeWebsite(user_id: string, url: string): Promise<ScrapeResult> {
//   const start = Date.now();
//   const domain = new URL(url).hostname;

//   let statusCode = 0;
//   let ipAddress = "N/A";
//   let message = "Unknown error";
//   let html = "";

//   try {
//     const response = await axios.get(url);
//     html = response.data;
//     statusCode = response.status;
//     const dnsResult = await dns.lookup(domain);
//     ipAddress = dnsResult.address;
//     message = statusCode >= 200 && statusCode < 400 ? "Website is up" : "Website responded with an error";
//   } catch (error) {
//     throw new Error(`Failed to fetch or resolve the website: ${(error as Error).message}`);
//   }

//   const responseTimeMs = Date.now() - start;

//   const newWebsite = await prisma.user_websites.create({
//     data: {
//       website_url: url,
//       users: { connect: { user_id } },
//     },
//     select: { website_id: true },
//   });

//   const websiteId = newWebsite.website_id;
//   const $ = cheerio.load(html);

//   // 🧠 Enhanced title tag handler
//   // function extractTitleTags(): string {
//   //   const titles = $("title").map((_, el) => $(el).text().trim()).get().filter(Boolean);
//   //   if (titles.length === 0) return "not found";
//   //   if (titles.length === 1) return titles[0];
//   //   return `${titles.join(" || ")} - needs attention - multiple title tags found`;
//   // }

//   function extractTitleTags(): object {
//     const titles = $("title").map((_, el) => $(el).text().trim()).get().filter(Boolean);
//     const status = titles.length === 0 ? "not found" : (titles.length === 1 ? "ok" : "multiple");
//     const message = titles.length > 1
//       ? `${titles.join(" || ")} - needs attention - multiple title tags found`
//       : (titles[0] || "not found");

//     return {
//       status,
//       titles,
//       message,
//     };
//   }

//   const meta = {
//     page_title: extractTitleTags(),
//     meta_description: $('meta[name="description"]').attr("content") || "not found",
//     meta_keywords: $('meta[name="keywords"]').attr("content") || "not found",
//     og_title: $('meta[property="og:title"]').attr("content") || "not found",
//     og_description: $('meta[property="og:description"]').attr("content") || "not found",
//     og_image: $('meta[property="og:image"]').attr("content") || "not found",
//   };

//   let twitter, facebook, instagram, linkedin, youtube, tiktok;
//   const otherLinks: string[] = [];

//   $("a").each((_, el) => {
//     const href = $(el).attr("href");
//     if (!href) return;
//     const link = href.toLowerCase();
//     if (link.includes("twitter.com")) twitter ||= href;
//     else if (link.includes("facebook.com")) facebook ||= href;
//     else if (link.includes("instagram.com")) instagram ||= href;
//     else if (link.includes("linkedin.com")) linkedin ||= href;
//     else if (link.includes("youtube.com")) youtube ||= href;
//     else if (link.includes("tiktok.com")) tiktok ||= href;
//     else otherLinks.push(href);
//   });

//   const imgTags = $("img");
//   const totalImages = imgTags.length;
//   const imagesWithAlt = imgTags.filter((_, el) => {
//     const alt = $(el).attr("alt");
//     return !!(alt && alt.trim().length > 0);
//   }).length;

//   const homepageAltTextCoverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;
//   const logoSelectors = [
//     'link[rel="icon"]',
//     'link[rel="shortcut icon"]',
//     'link[rel="apple-touch-icon"]',
//     'img[alt*="logo"]',
//     'img[src*="logo"]'
//   ];

//   let logoUrl = "not found";
//   for (const selector of logoSelectors) {
//     const el = $(selector).first();
//     let src = el.attr("href") || el.attr("src");
//     if (src) {
//       // Handle relative URLs
//       if (src.startsWith("//")) src = "https:" + src;
//       else if (src.startsWith("/")) src = new URL(src, url).href;
//       logoUrl = src;
//       break;
//     }
//   }
//   const sitemapUrls = await getRobotsTxtAndSitemaps(url);
//   const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();
//   const allUrls = new Set<string>([url, ...sitemapLinks.map(u => u.trim())]);
//   const uniqueUrls = [...allUrls];

//   let affectedPagesCount = 0;
//   const keyPages = await Promise.all(uniqueUrls.map(async (pageUrl) => {
//     try {
//       const res = await axios.get(pageUrl);
//       if (res.status >= 200 && res.status < 400) {
//         const $$ = cheerio.load(res.data);
//         const titles = $$("title").map((_, el) => $$(el).text().trim()).get().filter(Boolean);
//         const title = titles.length > 1 ? `${titles.join(" || ")} - needs attention - multiple title tags found` : (titles[0] || "not found");
//         const meta_description = $$('meta[name="description"]').attr("content") || "not found";
//         const og_title = $$('meta[property="og:title"]').attr("content") || "not found";
//         const meta_keywords = $$('meta[name="keywords"]').attr("content") || "not found";

//         const missingAny = !(title && meta_description && og_title && meta_keywords);
//         if (missingAny) affectedPagesCount++;

//         return { url: pageUrl, title, meta_description, og_title, meta_keywords };
//       }
//     } catch {
//       return null;
//     }
//   }));

//   const filteredPages = keyPages
//     .filter((p): p is NonNullable<typeof p> => !!p)
//     .map((p) => ({
//       url: p.url,
//       title: p.title ?? "not found",
//       meta_description: p.meta_description ?? "not found",
//       og_title: p.og_title ?? null,
//       meta_keywords: p.meta_keywords ?? "not found",
//     }));

//   const extract_message = sitemapLinks.length > 0 ? "Sitemap found" : "Sitemap not found";
//   const totalKeyPages = filteredPages.length;

//   const CTR_Loss_Percent = {
//     total_key_pages: totalKeyPages,
//     total_affected_pages: affectedPagesCount,
//     CTR_Loss_Percent: totalKeyPages > 0 ? Number(((affectedPagesCount / totalKeyPages) * 0.37).toFixed(2)) : 0,
//     extract_message,
//   };
//   console.log("validating schema markup...");
//   const schemaAnalysisData: SchemaOutput = await validateComprehensiveSchema(url, websiteId);
//   if (schemaAnalysisData) {
//     console.log("Schema validation completed successfully:", schemaAnalysisData);
//     const record = await prisma.website_scraped_data.create({
//       data: {
//         website_id: websiteId,
//         website_url: url,
//         page_title: JSON.stringify(meta.page_title),
//         logo_url: logoUrl,
//         meta_description: meta.meta_description,
//         meta_keywords: meta.meta_keywords,
//         og_title: meta.og_title,
//         og_description: meta.og_description,
//         og_image: meta.og_image,
//         twitter_handle: twitter,
//         facebook_handle: facebook,
//         instagram_handle: instagram,
//         linkedin_handle: linkedin,
//         youtube_handle: youtube,
//         tiktok_handle: tiktok,
//         ctr_loss_percent: CTR_Loss_Percent,
//         sitemap_pages: filteredPages,
//         schema_analysis: JSON.stringify(schemaAnalysisData),
//         homepage_alt_text_coverage: homepageAltTextCoverage,
//         other_links: otherLinks.length > 0 ? otherLinks : "not found",
//         raw_html: html,
//         status_code: statusCode,
//         ip_address: ipAddress,
//         response_time_ms: responseTimeMs,
//         status_message: message,
//       },
//     });

//     return {
//       website_id: record.website_id,
//       logo_url: record.logo_url ?? undefined

//     };
//   }
//   catch (error: any) {
//   const code = error?.response?.status || 500;
//   const raw = error?.response?.data || "";
//   statusCode = code;
//   html = typeof raw === "string" ? raw : "";
//   message = code === 404
//     ? "Website not found (404)"
//     : code === 429
//     ? "Scraping blocked (429)"
//     : `Fetch or DNS error: ${error.message}`;

//   const responseTimeMs = Date.now() - start;

//   return {
//     success: false,
//     status_code: code,
//     status_message: message,
//     ip_address,
//     response_time_ms: responseTimeMs,
//     raw_html: html,
//     error: message,
//   };
// }

 
// }



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

    const responseTimeMs = Date.now() - start;

    return {
      success: false,
      status_code: code,
      // status_message: message,
      // ip_address,
      // response_time_ms: responseTimeMs,
      // raw_html: html,
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
  const homepageAltTextCoverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;

  const logoSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'img[alt*="logo"]',
    'img[src*="logo"]',
  ];

  let logoUrl = "not found";
  for (const selector of logoSelectors) {
    const el = $(selector).first();
    let src = el.attr("href") || el.attr("src");
    if (src) {
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = new URL(src, url).href;
      logoUrl = src;
      break;
    }
  }

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

    const record = await prisma.website_scraped_data.create({
      data: {
        website_id: websiteId,
        website_url: url,
        page_title: JSON.stringify(meta.page_title),
        logo_url: logoUrl,
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
        ctr_loss_percent: CTR_Loss_Percent,
        sitemap_pages: filteredPages,
        schema_analysis: JSON.stringify(schemaAnalysisData),
        homepage_alt_text_coverage: homepageAltTextCoverage,
        other_links: otherLinks.length > 0 ? otherLinks : "not found",
        raw_html: html,
        status_code: statusCode,
        ip_address: ipAddress,
        response_time_ms: responseTimeMs,
        status_message: message,
      },
    });

    return {
      success: true,
      website_id: record.website_id,
      logo_url: record.logo_url ?? undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      // status_code: statusCode,
      
      // ip_address,
      // response_time_ms: responseTimeMs,
      // raw_html: html,
      error: error.message,
    };
  }
}
