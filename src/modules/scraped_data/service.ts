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

// export async function scrapeWebsite(websiteId: string): Promise<ScrapeResult> {
//   // Fetch URL from database using websiteId
//   const website = await prisma.user_websites.findUnique({
//     where: { website_id: websiteId },
//     select: { website_url: true },
//   });

//   if (!website || !website.website_url) {
//     throw new Error("Website URL not found for the given website ID");
//   }

//   const url = website.website_url;
//   const { data: html } = await axios.get(url);
//   const $ = cheerio.load(html);

//   const meta: ScrapedMetaData = {
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
//       other_links: otherLinks.length > 0 ? otherLinks : undefined,
//       raw_html: html,
//     },
//   });

//   return { record, youtubeUrl: youtube };
// }


export async function scrapeWebsite(user_id: string, url: string): Promise<ScrapeResult & { websiteId: string }> {
  // Check if website already exists for this user
  let website = await prisma.user_websites.findFirst({
    where: {
      website_url: url,
      user_id: user_id,
    },
    select: { website_id: true },
  });

  if (!website) {
    website = await prisma.user_websites.create({
      data: {
        website_url: url,
        users: {
          connect: { user_id: user_id },
        },
      },
      select: { website_id: true },
    });
  }

  const websiteId = website.website_id;

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

  // Save scraped data
  // const record = await prisma.website_scraped_data.create({
  //   data: {
  //     website_id: websiteId,
  //     website_url: url,
  //     page_title: meta.page_title,
  //     meta_description: meta.meta_description,
  //     meta_keywords: meta.meta_keywords,
  //     og_title: meta.og_title,
  //     og_description: meta.og_description,
  //     og_image: meta.og_image,
  //     twitter_handle: twitter,
  //     facebook_handle: facebook,
  //     instagram_handle: instagram,
  //     linkedin_handle: linkedin,
  //     youtube_handle: youtube,
  //     tiktok_handle: tiktok,
  //     other_links: otherLinks.length > 0 ? otherLinks : undefined,
  //     raw_html: html,
  //   },
  // });
  const record = await prisma.website_scraped_data.upsert({
  where: { website_id: websiteId },
  update: {
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
  create: {
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

  return { websiteId,record};
}


async function resolveYouTubeChannelId(youtubeUrl: string): Promise<string | null> {
  if (!youtubeUrl) return null;

  const channelMatch = youtubeUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) return channelMatch[1];

  const usernameMatch = youtubeUrl.match(/youtube\.com\/(user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
  const handle = usernameMatch?.[2];

  if (!handle) return null;

  try {
    const youtube = google.youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });

    const response = await youtube.channels.list({
      forUsername: handle,
      part: ["id"],
    });

    if (response.data.items?.[0]?.id) {
      return response.data.items[0].id;
    }

    // fallback: search by custom handle
    const searchResponse = await youtube.search.list({
      q: handle,
      type: ["channel"],
      part: ["snippet"],
      maxResults: 1,
    });

    const channelId = searchResponse.data.items?.[0]?.snippet?.channelId;
    return channelId || null;
  } catch (e) {
    console.error("❌ Error resolving custom YouTube handle:", e);
    return null;
  }
}


async function fetchYouTubeChannelData(channelId: string) {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const response = await youtube.channels.list({
    part: ["snippet", "statistics"],
    id: [channelId],
  });

  return response.data.items?.[0] || null;
}



async function fetchLastFiveVideos(channelId: string): Promise<string[]> {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const response = await youtube.search.list({
    channelId: channelId,  // Correctly use the channelId parameter
    part: ["id"],           // Specify part as an array
    maxResults: 5,          // Fetch 5 videos
    order: "date",          // Sort by date (newest first)
  });

  // Ensure we are only returning valid videoIds (filter out null or undefined values)
  if (response.data.items) {
    return response.data.items
      .map((item: youtube_v3.Schema$SearchResult) => {
        // Ensure item.id is defined and extract videoId
        return item.id ? item.id.videoId : undefined;
      })
      .filter((videoId): videoId is string => videoId !== undefined && videoId !== null); // Filter out undefined and null
  } else {
    console.error("No videos found for the channel.");
    return [];
  }
}


async function fetchVideoMetrics(channelId: string, videoIds: string[]): Promise<any[]> {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  const validVideoIds = videoIds.filter((id): id is string => id !== undefined && id !== null);

  if (validVideoIds.length === 0) {
    console.warn("No valid video IDs provided.");
    return [];
  }

  const response = await youtube.videos.list({
    id: validVideoIds,
    part: ["statistics"],
  });

  return response.data.items || [];
}


function calculateEngagementRate(videos: any[]): number {
  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;

  videos.forEach((video) => {
    const stats = video.statistics;
    if (stats) {
      totalLikes += parseInt(stats.likeCount || "0", 10);
      totalComments += parseInt(stats.commentCount || "0", 10);
      totalViews += parseInt(stats.viewCount || "0", 10);
    }
  });

  return totalViews > 0
    ? ((totalLikes + totalComments) / totalViews) * 100
    : 0;
}

