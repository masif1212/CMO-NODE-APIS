import { google, youtube_v3 } from "googleapis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function analyzeYouTubeDataByWebsiteId(youtube_handle: any) {
  
  console.log("youtubeUrl",youtube_handle)
  const channelId = await resolveYouTubeChannelId(youtube_handle);
  if (!channelId) return { status: "invalid-channel" };

  console.log("Resolved Channel ID:", channelId);

  const videoIdsAndDates = await fetchVideosLast30Days(channelId);
  if (videoIdsAndDates.length === 0) {
    console.log("No videos found for last 30 days");
    return { youtube_data: "No videos found for last 30 days"};
  }

  const videoIds = videoIdsAndDates.map((v) => v.videoId);
  const videoStats = await fetchVideoMetrics(videoIds);

  const videoMetrics = videoStats.map((v) => {
    const match = videoIdsAndDates.find((x) => x.videoId === v.id);
    return { ...v, publishedAt: match?.publishedAt };
  });

  const engagementRate = calculateEngagementRate(videoMetrics);

  const youtubeData = await fetchYouTubeChannelData(channelId);
  if (!youtubeData) return { status: "api-failure" };

  const stats = youtubeData.statistics;
  const followers = parseInt(stats?.subscriberCount || "0", 10);
  const comments = parseInt(stats?.commentCount || "0", 10);
  const videosCount = parseInt(stats?.videoCount || "0", 10);
  const safeJson = JSON.parse(JSON.stringify(youtubeData));

  const weeklyPostingGraph = getWeeklyPostingFrequencyWithLabels(videoIdsAndDates);
  const dailyPostingGraph = getDailyPostingFrequencyWithLabels(videoIdsAndDates);

  const engagementToFollowerRatio = engagementRate / 100;
  const postingFrequency = calculatePostingFrequency(videoIdsAndDates);
  const perPostEngagement = {
    dailyMetrics: aggregateDailyMetrics(videoMetrics),
    dailyFrequency: dailyPostingGraph,
    weeklyFrequency: weeklyPostingGraph,
  };






const youtube_data = {
  message:"yotube data found",
  youtube_handle,
 profile : {
  ...safeJson.snippet, // Fix: Remove .Data
  ...safeJson.statistics
},
  engagement_rate: engagementRate,
  engagementToFollowerRatio,
  postingFrequency,
  perPostEngagement,
  comments,
  
};
  


return { youtube_data };
}

async function resolveYouTubeChannelId(url: string): Promise<string | null> {
  const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) return channelMatch[1];

  const usernameMatch = url.match(/youtube\.com\/(?:user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
  const handle = usernameMatch?.[1];
  if (!handle) return null;

  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

  try {
    const res = await youtube.channels.list({ forUsername: handle, part: ["id"] });
    const data: youtube_v3.Schema$ChannelListResponse = res.data;
    if (data.items?.[0]?.id) return data.items[0].id;
  } catch {}

  const searchRes = await youtube.search.list({
    q: handle,
    type: ["channel"],
    part: ["snippet"],
    maxResults: 1,
  });
  const searchData: youtube_v3.Schema$SearchListResponse = searchRes.data;

  const channelId = searchData.items?.[0]?.snippet?.channelId || null;
  return channelId;
}

async function fetchYouTubeChannelData(channelId: string): Promise<youtube_v3.Schema$Channel | null> {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const res = await youtube.channels.list({ part: ["snippet", "statistics"], id: [channelId] });
  const data: youtube_v3.Schema$ChannelListResponse = res.data;
  return data.items?.[0] || null;
}

async function fetchVideosLast30Days(channelId: string): Promise<{ videoId: string, publishedAt: string }[]> {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let nextPageToken: string | undefined = undefined;
  const videos: { videoId: string, publishedAt: string }[] = [];

  do {
    const res = await youtube.search.list({
      channelId,
      part: ["id", "snippet"],
      maxResults: 50,
      order: "date",
      type: ["video"],
      publishedAfter,
      pageToken: nextPageToken,
    });

    const data: youtube_v3.Schema$SearchListResponse = res.data;

    for (const item of data.items || []) {
      const videoId = item.id?.videoId;
      const publishedAt = item.snippet?.publishedAt;
      if (videoId && publishedAt) {
        videos.push({ videoId, publishedAt });
      }
    }
    
    nextPageToken = data.nextPageToken ?? undefined;
  } while (nextPageToken);

  return videos;
}

async function fetchVideoMetrics(videoIds: string[]): Promise<youtube_v3.Schema$Video[]> {
  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
  const allStats: youtube_v3.Schema$Video[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const res = await youtube.videos.list({ id: chunk, part: ["statistics"] });
    const data: youtube_v3.Schema$VideoListResponse = res.data;
    allStats.push(...(data.items || []));
  }

  return allStats;
}

function calculateEngagementRate(videos: (youtube_v3.Schema$Video & { publishedAt?: string })[]): number {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let totalLikes = 0, totalComments = 0, totalViews = 0;

  for (const video of videos) {
    const published = video.publishedAt ? new Date(video.publishedAt).getTime() : 0;
    if (published < cutoff) continue;

    const stats = video.statistics;
    totalLikes += parseInt(stats?.likeCount || "0", 10);
    totalComments += parseInt(stats?.commentCount || "0", 10);
    totalViews += parseInt(stats?.viewCount || "0", 10);
  }

  return totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
}

function aggregateDailyMetrics(videos: (youtube_v3.Schema$Video & { publishedAt?: string })[]) {
  const result: Record<string, { views: number; likes: number; comments: number; engagementRate: number; postCount: number }> = {};

  for (const video of videos) {
    const publishedAt = video.publishedAt;
    const date = publishedAt?.split("T")[0];
    if (!date) continue;

    const stats = video.statistics;
    const views = parseInt(stats?.viewCount || "0", 10);
    const likes = parseInt(stats?.likeCount || "0", 10);
    const comments = parseInt(stats?.commentCount || "0", 10);

    if (!result[date]) {
      result[date] = { views: 0, likes: 0, comments: 0, engagementRate: 0, postCount: 0 };
    }

    result[date].views += views;
    result[date].likes += likes;
    result[date].comments += comments;
    result[date].postCount += 1;

    const totalViews = result[date].views;
    const totalLikes = result[date].likes;
    const totalComments = result[date].comments;

    result[date].engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
  }

  return result;
}

function calculatePostingFrequency(videos: { publishedAt: string }[]): number {
  if (videos.length < 2) return videos.length;

  const dates = videos.map(v => new Date(v.publishedAt).getTime()).sort((a, b) => a - b);
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const monthsSpan = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30) || 1;

  return videos.length / monthsSpan;
}

function getWeeklyPostingFrequencyWithLabels(videos: { publishedAt: string }[]) {
  const now = new Date();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;

  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const end = new Date(now.getTime() - (3 - i) * weekInMs);
    const start = new Date(end.getTime() - weekInMs);
    return { start, end, count: 0 };
  });

  for (const video of videos) {
    const publishedAt = new Date(video.publishedAt);
    for (const week of weeklyData) {
      if (publishedAt >= week.start && publishedAt < week.end) {
        week.count += 1;
        break;
      }
    }
  }

  return weeklyData.map(({ start, end, count }) => ({
    label: `${formatDate(start)}–${formatDate(end)}`,
    count,
  }));
}

function getDailyPostingFrequencyWithLabels(videos: { publishedAt: string }[]) {
  const frequencyMap: Record<string, number> = {};
  for (const video of videos) {
    const date = video.publishedAt.split("T")[0];
    frequencyMap[date] = (frequencyMap[date] || 0) + 1;
  }

  return Object.entries(frequencyMap).map(([date, count]) => ({
    label: date,
    count,
  }));
}



function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}