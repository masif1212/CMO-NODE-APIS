import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function analyzeYouTubeDataByWebsiteId(website_id: string) {
  // Step 1: Get YouTube handle from DB
  const scrapedData = await prisma.website_scraped_data.findUnique({
    where: { website_id: website_id },
  });

  if (!scrapedData || !scrapedData.youtube_handle) {
    return { status: "no-youtube-handle" };
  }

  const youtubeUrl = scrapedData.youtube_handle;
  // console.log("🔗 Found YouTube URL:", youtubeUrl);

  const channelId = await resolveYouTubeChannelId(youtubeUrl);
  if (!channelId) return { status: "invalid-channel" };

  const videoIds = await fetchLastFiveVideos(channelId);
  if (videoIds.length === 0) return { status: "no-videos-found" };

  const videoMetrics = await fetchVideoMetrics(videoIds);
  const engagementRate = calculateEngagementRate(videoMetrics);

  const youtubeData = await fetchYouTubeChannelData(channelId);
  if (!youtubeData) return { status: "api-failure" };

  const stats = youtubeData.statistics;
  const followers = parseInt(stats?.subscriberCount || "0", 10);
  const comments = parseInt(stats?.commentCount || "0", 10);
  const videosCount = parseInt(stats?.videoCount || "0", 10);
  const safeJson = JSON.parse(JSON.stringify(youtubeData));

  const existing = await prisma.brand_social_media_analysis.findFirst({
    where: {
      website_id: website_id,
      platform_name: "YouTube",
    },
  });

  if (existing) {
    await prisma.brand_social_media_analysis.update({
      where: { social_media_id: existing.social_media_id },
      data: {
        followers,
        comments,
        videos_count: videosCount,
        posts_count: videosCount,
        engagement_rate: engagementRate,
        data: safeJson,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.brand_social_media_analysis.create({
      data: {
        website_id: website_id,
        platform_name: "YouTube",
        followers,
        comments,
        videos_count: videosCount,
        posts_count: videosCount,
        engagement_rate: engagementRate,
        data: safeJson,
      },
    });
  }

  return {
    followers,
    comments,
    videosCount,
    engagementRate,
    rawData: safeJson,
  };
}

async function resolveYouTubeChannelId(url: string): Promise<string | null> {
  const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) return channelMatch[1];

  const usernameMatch = url.match(/youtube\.com\/(user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
  const handle = usernameMatch?.[2];
  if (!handle) return null;

  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

  const response = await youtube.channels.list({ forUsername: handle, part: ["id"] });
  if (response.data.items?.[0]?.id) return response.data.items[0].id;

  const searchResponse = await youtube.search.list({ q: handle, type: ["channel"], part: ["snippet"], maxResults: 1 });
  return searchResponse.data.items?.[0]?.snippet?.channelId || null;
}

async function fetchYouTubeChannelData(channelId: string) {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const response = await youtube.channels.list({ part: ["snippet", "statistics"], id: [channelId] });
  return response.data.items?.[0] || null;
}

async function fetchLastFiveVideos(channelId: string): Promise<string[]> {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const response = await youtube.search.list({ channelId, part: ["id"], maxResults: 5, order: "date" });
  return response.data.items
    ?.map((item) => item.id?.videoId)
    .filter((id): id is string => !!id) || [];
}

async function fetchVideoMetrics(videoIds: string[]) {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const response = await youtube.videos.list({ id: videoIds, part: ["statistics"] });
  return response.data.items || [];
}

function calculateEngagementRate(videos: any[]): number {
  let totalLikes = 0, totalComments = 0, totalViews = 0;
  for (const video of videos) {
    const stats = video.statistics;
    totalLikes += parseInt(stats?.likeCount || "0", 10);
    totalComments += parseInt(stats?.commentCount || "0", 10);
    totalViews += parseInt(stats?.viewCount || "0", 10);
  }
  return totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
}
