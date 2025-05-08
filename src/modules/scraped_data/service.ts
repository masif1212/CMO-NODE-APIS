// import axios from "axios";
// import * as cheerio from "cheerio";
// import type { Element } from "domhandler";
// import { PrismaClient } from "@prisma/client";
// import { google, youtube_v3 } from "googleapis";
// import { v4 as uuidv4 } from "uuid";

// const prisma = new PrismaClient();

// interface ScrapedMetaData {
//   page_title?: string;
//   meta_description?: string;
//   meta_keywords?: string;
//   og_title?: string;
//   og_description?: string;
//   og_image?: string;
// }

// interface ScrapeResult {
//   record: any;
//   youtubeUrl?: string;
// }

// export async function handleWebsiteDataWithUpsert(websiteUrl: string, userId: string) {
//   try {
//     // Step 1: Get or create website_id
//     let userWebsite = await prisma.user_websites.findFirst({
//       where: { website_url: websiteUrl },
//     });

//     if (!userWebsite) {
//       userWebsite = await prisma.user_websites.create({
//         data: {
//           website_id: uuidv4(),
//           website_url: websiteUrl,
//           user_id: userId,
//         },
//       });
//     }

//     const websiteId = userWebsite.website_id;

//     // Step 2: Scrape website
//     const { record, youtubeUrl } = await scrapeWebsite(websiteUrl, websiteId);

//     // Step 3: Handle YouTube metadata
//     if (youtubeUrl) {
//       const channelId = extractYouTubeChannelId(youtubeUrl);
//       if (channelId) {
//         const youtubeData = await fetchYouTubeChannelData(channelId);
//         if (youtubeData) {
//           const stats = youtubeData.statistics;
//           const videosCount = parseInt(stats?.videoCount || "0", 10);
//           const followers = parseInt(stats?.subscriberCount || "0", 10);
//           const engagementRate =
//             stats?.viewCount && followers > 0
//               ? parseInt(stats.viewCount, 10) / followers
//               : undefined;

//           // Step 4: Manual check then update or create
//           const existing = await prisma.brand_social_media_analysis.findFirst({
//             where: {
//               website_id: websiteId,
//               platform_name: "YouTube",
//             },
//           });

//           const safeJson = JSON.parse(JSON.stringify(youtubeData));

//           if (existing) {
//             await prisma.brand_social_media_analysis.update({
//               where: { social_media_id: existing.social_media_id },
//               data: {
//                 followers,
//                 videos_count: videosCount,
//                 posts_count: videosCount,
//                 engagement_rate: engagementRate,
//                 data: safeJson,
//                 updated_at: new Date(),
//               },
//             });
//           } else {
//             await prisma.brand_social_media_analysis.create({
//               data: {
//                 website_id: websiteId,
//                 platform_name: "YouTube",
//                 followers,
//                 videos_count: videosCount,
//                 posts_count: videosCount,
//                 engagement_rate: engagementRate,
//                 data: safeJson,
//               },
//             });
//           }
//         }
//       }
//     }

//     return record;
//   } catch (err) {
//     console.error("handleWebsiteDataWithUpsert error:", err);
//     throw err;
//   }
// }

// async function scrapeWebsite(url: string, websiteId: string): Promise<ScrapeResult> {
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

//   $("a").each((_: number, el: Element) => {
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

// function extractYouTubeChannelId(youtubeUrl: string): string | null {
//   const match = youtubeUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
//   return match ? match[1] : null;
// }

// async function fetchYouTubeChannelData(channelId: string) {
//   const youtube = google.youtube({
//     version: "v3",
//     auth: process.env.YOUTUBE_API_KEY,
//   });

//   const response = await youtube.channels.list({
//     part: ["snippet", "statistics"],
//     id: [channelId],
//   });

//   return response.data.items?.[0] || null;
// }


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

// export async function handleWebsiteDataWithUpsert(websiteUrl: string, userId: string) {
//   try {
//     console.log("🚀 Starting scrape for:", websiteUrl);

//     // Step 1: Get or create user website
//     let userWebsite = await prisma.user_websites.findFirst({
//       where: { website_url: websiteUrl },
//     });

//     if (!userWebsite) {
//       userWebsite = await prisma.user_websites.create({
//         data: {
//           website_id: uuidv4(),
//           website_url: websiteUrl,
//           user_id: userId,
//         },
//       });
//     }

//     const websiteId = userWebsite.website_id;

//     // Step 2: Scrape website
//     const { record, youtubeUrl } = await scrapeWebsite(websiteUrl, websiteId);

//     console.log("🔗 YouTube URL scraped:", youtubeUrl);

//     // Step 3: YouTube data fetch + store
//     if (youtubeUrl) {
//       const channelId = await resolveYouTubeChannelId(youtubeUrl);

//       console.log("🧩 Extracted Channel ID:", channelId);

//       if (!channelId) {
//         console.warn("⚠️ No valid /channel/ ID extracted. Skipping YouTube API call.");
//         return record;
//       }

//       if (!process.env.YOUTUBE_API_KEY) {
//         console.warn("❌ YOUTUBE_API_KEY is not defined in .env");
//         return record;
//       }

//       const youtubeData = await fetchYouTubeChannelData(channelId);
//       console.log("📊 YouTube API Response:", JSON.stringify(youtubeData, null, 2));

//       if (!youtubeData) {
//         console.warn("⚠️ No data received from YouTube API.");
//         return record;
//       }

//       const stats = youtubeData.statistics;
//       const videosCount = parseInt(stats?.videoCount || "0", 10);
//       const followers = parseInt(stats?.subscriberCount || "0", 10);
//       const engagementRate =
//         stats?.viewCount && followers > 0
//           ? parseInt(stats.viewCount, 10) / followers
//           : undefined;

//       const safeJson = JSON.parse(JSON.stringify(youtubeData));

//       // Step 4: Manual insert/update
//       const existing = await prisma.brand_social_media_analysis.findFirst({
//         where: {
//           website_id: websiteId,
//           platform_name: "YouTube",
//         },
//       });

//       if (existing) {
//         try {
//           await prisma.brand_social_media_analysis.update({
//             where: { social_media_id: existing.social_media_id },
//             data: {
//               followers,
//               videos_count: videosCount,
//               posts_count: videosCount,
//               engagement_rate: engagementRate,
//               data: safeJson,
//               updated_at: new Date(),
//             },
//           });
//           console.log("✅ YouTube analytics updated.");
//         } catch (e) {
//           console.error("❌ Failed to update YouTube data:", e);
//         }
//       } else {
//         try {
//           await prisma.brand_social_media_analysis.create({
//             data: {
//               website_id: websiteId,
//               platform_name: "YouTube",
//               followers,
//               videos_count: videosCount,
//               posts_count: videosCount,
//               engagement_rate: engagementRate,
//               data: safeJson,
//             },
//           });
//           console.log("✅ YouTube analytics created.");
//         } catch (e) {
//           console.error("❌ Failed to create YouTube data:", e);
//         }
//       }
//     }

//     return record;
//   } catch (err) {
//     console.error("❌ Error in handleWebsiteDataWithUpsert:", err);
//     throw err;
//   }
// }


// export async function handleWebsiteDataWithUpsert(websiteUrl: string, userId: string) {
//   try {
//     console.log("🚀 Starting scrape for:", websiteUrl);

//     // Step 1: Get or create user website
//     let userWebsite = await prisma.user_websites.findFirst({
//       where: { website_url: websiteUrl },
//     });

//     if (!userWebsite) {
//       userWebsite = await prisma.user_websites.create({
//         data: {
//           website_id: uuidv4(),
//           website_url: websiteUrl,
//           user_id: userId,
//         },
//       });
//     }

//     const websiteId = userWebsite.website_id;

//     // Step 2: Scrape website
//     const { record, youtubeUrl } = await scrapeWebsite(websiteUrl, websiteId);

//     console.log("🔗 YouTube URL scraped:", youtubeUrl);

//     // Step 3: YouTube data fetch + store
//     if (youtubeUrl) {
//       const channelId = await resolveYouTubeChannelId(youtubeUrl);

//       console.log("🧩 Extracted Channel ID:", channelId);

//       if (!channelId) {
//         console.warn("⚠️ No valid /channel/ ID extracted. Skipping YouTube API call.");
//         return record;
//       }

//       if (!process.env.YOUTUBE_API_KEY) {
//         console.warn("❌ YOUTUBE_API_KEY is not defined in .env");
//         return record;
//       }

//       // Fetch the last 5 videos
//       const videoIds = await fetchLastFiveVideos(channelId);
//       console.log("🎥 Video IDs fetched:", videoIds);

//       if (videoIds.length === 0) {
//         console.warn("⚠️ No videos found for the channel.");
//         return record;
//       }

//       // Fetch the metrics of the videos
//       const videoMetrics = await fetchVideoMetrics(channelId, videoIds);
//       console.log("📊 Video Metrics fetched:", videoMetrics);

//       // Calculate engagement rate
//       const engagementRate = calculateEngagementRate(videoMetrics);
//       console.log("📈 Engagement Rate calculated:", engagementRate);

//       // Prepare data to be saved
//       const stats = videoMetrics[0]?.statistics;
//       const followers = parseInt(stats?.subscriberCount || "0", 10);
//       const videosCount = videoMetrics.length;
      
//       const safeJson = JSON.parse(JSON.stringify(videoMetrics));

//       // Step 4: Manual insert/update
//       const existing = await prisma.brand_social_media_analysis.findFirst({
//         where: {
//           website_id: websiteId,
//           platform_name: "YouTube",
//         },
//       });

//       if (existing) {
//         await prisma.brand_social_media_analysis.update({
//           where: { social_media_id: existing.social_media_id },
//           data: {
//             followers,
//             videos_count: videosCount,
//             posts_count: videosCount,
//             engagement_rate: engagementRate,
//             data: safeJson,
//             updated_at: new Date(),
//           },
//         });
//         console.log("✅ YouTube analytics updated.");
//       } else {
//         await prisma.brand_social_media_analysis.create({
//           data: {
//             website_id: websiteId,
//             platform_name: "YouTube",
//             followers,
//             videos_count: videosCount,
//             posts_count: videosCount,
//             engagement_rate: engagementRate,
//             data: safeJson,
//           },
//         });
//         console.log("✅ YouTube analytics created.");
//       }
//     }

//     return record;
//   } catch (err) {
//     console.error("❌ Error in handleWebsiteDataWithUpsert:", err);
//     throw err;
//   }
// }


export async function handleWebsiteDataWithUpsert(websiteUrl: string, userId: string) {
  try {
    console.log("🚀 Starting scrape for:", websiteUrl);

    // Step 1: Get or create user website
    let userWebsite = await prisma.user_websites.findFirst({
      where: { website_url: websiteUrl },
    });

    if (!userWebsite) {
      userWebsite = await prisma.user_websites.create({
        data: {
          website_id: uuidv4(),
          website_url: websiteUrl,
          user_id: userId,
        },
      });
    }

    const websiteId = userWebsite.website_id;

    // Step 2: Scrape website
    const { record, youtubeUrl } = await scrapeWebsite(websiteUrl, websiteId);

    console.log("🔗 YouTube URL scraped:", youtubeUrl);

    // Step 3: YouTube data fetch + store
    if (youtubeUrl) {
      const channelId = await resolveYouTubeChannelId(youtubeUrl);

      console.log("🧩 Extracted Channel ID:", channelId);

      if (!channelId) {
        console.warn("⚠️ No valid /channel/ ID extracted. Skipping YouTube API call.");
        return record;
      }

      if (!process.env.YOUTUBE_API_KEY) {
        console.warn("❌ YOUTUBE_API_KEY is not defined in .env");
        return record;
      }

      // Fetch the last 5 videos
      const videoIds = await fetchLastFiveVideos(channelId);
      console.log("🎥 Video IDs fetched:", videoIds);

      if (videoIds.length === 0) {
        console.warn("⚠️ No videos found for the channel.");
        return record;
      }

      // Fetch the metrics of the videos
      const videoMetrics = await fetchVideoMetrics(channelId, videoIds);
      console.log("📊 Video Metrics fetched:", videoMetrics);

      // Calculate engagement rate
      const engagementRate = calculateEngagementRate(videoMetrics);
      console.log("📈 Engagement Rate calculated:", engagementRate);

      // Fetch channel statistics (subscribers, likes, comments)
      const youtubeData = await fetchYouTubeChannelData(channelId);
      if (!youtubeData) {
        console.warn("⚠️ No data received from YouTube API.");
        return record;
      }

      const stats = youtubeData.statistics;
      const followers = parseInt(stats?.subscriberCount || "0", 10); // Total subscribers
    //   const likes = parseInt(stats?.like || "0", 10); // Likes on the channel (if available)
      const comments = parseInt(stats?.commentCount || "0", 10); // Total comments (if available)
      const videosCount = parseInt(stats?.videoCount || "0", 10); // Total videos

      const safeJson = JSON.parse(JSON.stringify(youtubeData));

      // Step 4: Manual insert/update
      const existing = await prisma.brand_social_media_analysis.findFirst({
        where: {
          website_id: websiteId,
          platform_name: "YouTube",
        },
      });

      if (existing) {
        await prisma.brand_social_media_analysis.update({
          where: { social_media_id: existing.social_media_id },
          data: {
            followers,
            // likes, // Add total likes here
            comments, // Add total comments here
            videos_count: videosCount,
            posts_count: videosCount,
            engagement_rate: engagementRate,
            data: safeJson,
            updated_at: new Date(),
          },
        });
        console.log("✅ YouTube analytics updated.");
      } else {
        await prisma.brand_social_media_analysis.create({
          data: {
            website_id: websiteId,
            platform_name: "YouTube",
            followers,
            // likes,
            comments,
            videos_count: videosCount,
            posts_count: videosCount,
            engagement_rate: engagementRate,
            data: safeJson,
          },
        });
        console.log("✅ YouTube analytics created.");
      }
    }

    return record;
  } catch (err) {
    console.error("❌ Error in handleWebsiteDataWithUpsert:", err);
    throw err;
  }
}


async function scrapeWebsite(url: string, websiteId: string): Promise<ScrapeResult> {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const meta: ScrapedMetaData = {
    page_title: $("title").text() || undefined,
    meta_description: $('meta[name="description"]').attr("content") || undefined,
    meta_keywords: $('meta[name="keywords"]').attr("content") || undefined,
    og_title: $('meta[property="og:title"]').attr("content") || undefined,
    og_description: $('meta[property="og:description"]').attr("content") || undefined,
    og_image: $('meta[property="og:image"]').attr("content") || undefined,
  };

  let twitter, facebook, instagram, linkedin, youtube, tiktok;
  const otherLinks: string[] = [];

  $("a").each((_: number, el: Element) => {
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

  return { record, youtubeUrl: youtube };
}

// function extractYouTubeChannelId(youtubeUrl: string): string | null {
//   const match = youtubeUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
//   return match ? match[1] : null;
// }


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



async function fetchVideoMetrics(channelId: string,videoIds: string[]): Promise<any[]> {
  const youtube = google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY,
  });

  // Ensure only valid video IDs are used
  const validVideoIds = videoIds.filter((id): id is string => id !== undefined && id !== null);

  if (validVideoIds.length === 0) {
    console.warn("No valid video IDs provided.");
    return [];
  }

  const response = await youtube.search.list({
    channelId: channelId,  // Correctly use the channelId parameter
    part: ["id"],           // Specify part as an array
    maxResults: 5,          // Fetch 5 videos
    order: "date",          // Sort by date (newest first)
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
