import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { PrismaClient } from "@prisma/client";
import { google, youtube_v3 } from "googleapis";
import { v4 as uuidv4 } from "uuid";

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
  youtubeUrl?: string;
}


export async function scrapeWebsite(user_id: string, url: string): Promise<ScrapeResult & { websiteId: string }> {
  // ✅ Always create a new website record
  const newWebsite = await prisma.user_websites.create({
    data: {
      website_url: url,
      users: {
        connect: { user_id: user_id },
      },
    },
    select: { website_id: true },
  });

  const websiteId = newWebsite.website_id;

  // Fetch and load the HTML
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  // Extract metadata
  const meta: ScrapedMetaData = {
    page_title: $("title").text() || undefined,
    meta_description: $('meta[name="description"]').attr("content") || undefined,
    meta_keywords: $('meta[name="keywords"]').attr("content") || undefined,
    og_title: $('meta[property="og:title"]').attr("content") || undefined,
    og_description: $('meta[property="og:description"]').attr("content") || undefined,
    og_image: $('meta[property="og:image"]').attr("content") || undefined,
  };

  // Social links extraction
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

  // ✅ Always create new scraped data (no upsert)
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
    },
  });

  return { websiteId, record };
}

