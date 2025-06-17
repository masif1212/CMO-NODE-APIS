import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import { PrismaClient } from "@prisma/client";

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
  websiteId: string;
  statusCode: number;
  ipAddress: string;
  responseTimeMs: number;
  message: string;
}

export async function scrapeWebsite(user_id: string, url: string): Promise<ScrapeResult> {
  const start = Date.now();
  const domain = new URL(url).hostname;

  let statusCode = 0;
  let ipAddress = "N/A";
  let message = "Unknown error";
  let html: string = "";

  try {
    const response = await axios.get(url);
    html = response.data;
    statusCode = response.status;
    const dnsResult = await dns.lookup(domain);
    ipAddress = dnsResult.address;
    message = statusCode >= 200 && statusCode < 400 ? "Website is up" : "Website responded with an error";
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch or resolve the website: ${error.message}`);
    } else {
      throw new Error("Unknown error occurred during website scraping.");
    }
  }

  const responseTimeMs = Date.now() - start;

  // Create new website record (always)
  const newWebsite = await prisma.user_websites.create({
    data: {
      website_url: url,
      users: {
        connect: { user_id },
      },
    },
    select: { website_id: true },
  });

  const websiteId = newWebsite.website_id;
  const $ = cheerio.load(html);

  const meta: ScrapedMetaData = {
    page_title: $("title").text() || undefined,
    meta_description: $('meta[name="description"]').attr("content") || undefined,
    meta_keywords: $('meta[name="keywords"]').attr("content") || undefined,
    og_title: $('meta[property="og:title"]').attr("content") || undefined,
    og_description: $('meta[property="og:description"]').attr("content") || undefined,
    og_image: $('meta[property="og:image"]').attr("content") || undefined,
  };

  // Social media and external links
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

  // Save scraped data
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
      other_links: otherLinks.length > 0 ? otherLinks : undefined,
      raw_html: html,

      // ✅ Network diagnostics
      status_code: statusCode,
      ip_address: ipAddress,
      response_time_ms: responseTimeMs,
      status_message: message,
    },
  });

  return {
    websiteId,
    record,
    statusCode,
    ipAddress,
    responseTimeMs,
    message,
  };
}


