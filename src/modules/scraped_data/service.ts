import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
const prisma = new PrismaClient();

interface ScrapedMetaData {
  page_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
}

interface ScrapeResult {
  record: any;
  // websiteId: string;
  // statusCode: number;
  // ipAddress: string;
  // responseTimeMs: number;
  // message: string;
  // sitemapPages?: any[];
  // CTR_Loss_Percent?: number;
}



async function getRobotsTxtAndSitemaps(baseUrl: string): Promise<string[]> {
  try {
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
  } catch (error) {
    throw new Error(`Failed to fetch or resolve the website: ${(error as Error).message}`);
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

  const meta = {
    page_title: $("title").text() || undefined,
    meta_description: $('meta[name="description"]').attr("content") || undefined,
    meta_keywords: $('meta[name="keywords"]').attr("content") || undefined,
    og_title: $('meta[property="og:title"]').attr("content") || undefined,
    og_description: $('meta[property="og:description"]').attr("content") || undefined,
    og_image: $('meta[property="og:image"]').attr("content") || undefined,
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

  // Fetch sitemap URLs
  const sitemapUrls = await getRobotsTxtAndSitemaps(url);
  const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();

  // Add home page explicitly
  const allUrls = new Set<string>([url, ...sitemapLinks.map(u => u.trim())]);

  const uniqueUrls = [...allUrls];
  let affectedPagesCount = 0;

  const keyPages = await Promise.all(uniqueUrls.map(async (pageUrl) => {
    try {
      const res = await axios.get(pageUrl);
      if (res.status >= 200 && res.status < 400) {
        const $$ = cheerio.load(res.data);
        const title = $$("title").text() || undefined;
        const meta_description = $$('meta[name="description"]').attr("content") || undefined;
        const og_title = $$('meta[property="og:title"]').attr("content") || undefined;
        const meta_keywords = $$('meta[name="keywords"]').attr("content") || undefined;

        const missingAny = !(title && meta_description && og_title && meta_keywords);
        if (missingAny) affectedPagesCount++;

        return { url: pageUrl, title, meta_description, og_title, meta_keywords };
      }
    } catch {
      return null;
    }
  }));

  const filteredPages = keyPages
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      url: p.url,
      title: p.title ?? null,
      meta_description: p.meta_description ?? null,
      og_title: p.og_title ?? null,
      meta_keywords: p.meta_keywords ?? null,
    }));

  const extract_message = sitemapLinks.length > 0 ? "Sitemap found" : "Sitemap not found";
  const totalKeyPages = filteredPages.length;

  const CTR_Loss_Percent = {
    total_key_pages: totalKeyPages,
    total_affected_pages: affectedPagesCount,
    CTR_Loss_Percent: totalKeyPages > 0 ? Number(((affectedPagesCount / totalKeyPages) * 0.37).toFixed(2)) : 0,
    extract_message,
  };

  const record = await prisma.website_scraped_data.create({
    data: {
      website_id: websiteId,
      website_url: url,
      page_title: meta.page_title,
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
      other_links: otherLinks.length > 0 ? otherLinks : undefined,
      raw_html: html,
      status_code: statusCode,
      ip_address: ipAddress,
      response_time_ms: responseTimeMs,
      status_message: message,
    },
  });

  return {
    record: {
      ...record,
      raw_html: undefined,
      other_links: undefined,
      sitemap_pages: undefined,
    },
  };
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

//   const meta = {
//     page_title: $("title").text() || undefined,
//     meta_description: $('meta[name="description"]').attr("content") || undefined,
//     meta_keywords: $('meta[name="keywords"]').attr("content") || undefined,
//     og_title: $('meta[property="og:title"]').attr("content") || undefined,
//     og_description: $('meta[property="og:description"]').attr("content") || undefined,
//     og_image: $('meta[property="og:image"]').attr("content") || undefined,
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

//   // Sitemap scraping
//   const sitemapUrls = await getRobotsTxtAndSitemaps(url);
//   const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();

//   let affectedPagesCount = 0;
//   let totalKeyPages = 0;

//   const sitemapPages = await Promise.all(sitemapLinks.map(async (pageUrl) => {
//     try {
//       const res = await axios.get(pageUrl);
//       if (res.status >= 200 && res.status < 400) {
//         const $$ = cheerio.load(res.data);
//         const title = $$("title").text() || undefined;
//         const meta_description = $$('meta[name="description"]').attr("content") || undefined;
//         const og_title = $$('meta[property="og:title"]').attr("content") || undefined;
//         const meta_keywords = $$('meta[name="keywords"]').attr("content") || undefined;

//         const missingAny = !(title && meta_description && og_title && meta_keywords);
//         if (missingAny) affectedPagesCount++;
//         totalKeyPages++;

//         return { url: pageUrl, title, meta_description, og_title, meta_keywords };
//       }
//     } catch {
//       return null;
//     }
//   }));

//   const filteredPages = sitemapPages
//     .filter((p): p is NonNullable<typeof p> => !!p)
//     .map((p) => ({
//       url: p.url,
//       title: p.title ?? null,
//       meta_description: p.meta_description ?? null,
//       og_title: p.og_title ?? null,
//       meta_keywords: p.meta_keywords ?? null,
//     }));

//   const CTR_Loss_Percent = {
//     total_key_pages: totalKeyPages,
//     total_affected_pages: affectedPagesCount,
//     CTR_Loss_Percent: totalKeyPages > 0 ? Number(((affectedPagesCount / totalKeyPages) * 37).toFixed(2)) : 0,
//   };

//   const record = await prisma.website_scraped_data.create({
//     data: {
//       website_id: websiteId,
//       website_url: url,
//       page_title: meta.page_title,
//       meta_description: meta.meta_description,
//       meta_keywords: meta.meta_keywords,
//       og_title: meta.og_title,
//       og_description: meta.og_description,
//       og_image: meta.og_image,
//       twitter_handle: twitter,
//       facebook_handle: facebook,
//       instagram_handle: instagram,
//       linkedin_handle: linkedin,
//       youtube_handle: youtube,
//       tiktok_handle: tiktok,
//       ctr_loss_percent: CTR_Loss_Percent,
//       sitemap_pages: filteredPages,
//       other_links: otherLinks.length > 0 ? otherLinks : undefined,
//       raw_html: html,
//       status_code: statusCode,
//       ip_address: ipAddress,
//       response_time_ms: responseTimeMs,
//       status_message: message,
//     },
//   });

//   return {
//     // websiteId,
//     record: {
//       ...record,
//       raw_html: undefined,
//       other_links: undefined,
//       sitemap_pages: undefined,
//     },
//   };
// }


