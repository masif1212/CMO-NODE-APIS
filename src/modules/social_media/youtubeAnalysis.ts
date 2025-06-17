// // import { google } from "googleapis";
// // import { PrismaClient } from "@prisma/client";

// // const prisma = new PrismaClient();

// // export async function analyzeYouTubeDataByWebsiteId(website_id: string) {
// //   // Step 1: Get YouTube handle from DB
// //   const scrapedData = await prisma.website_scraped_data.findUnique({
// //     where: { website_id: website_id },
// //   });

// //   if (!scrapedData || !scrapedData.youtube_handle) {
// //     return { status: "no-youtube-handle" };
// //   }

// //   const youtubeUrl = scrapedData.youtube_handle;
// //   // console.log("🔗 Found YouTube URL:", youtubeUrl);

// //   const channelId = await resolveYouTubeChannelId(youtubeUrl);
// //   if (!channelId) return { status: "invalid-channel" };

// //   const videoIds = await fetchLastFiveVideos(channelId);
// //   if (videoIds.length === 0) return { status: "no-videos-found" };

// //   const videoMetrics = await fetchVideoMetrics(videoIds);
// //   const engagementRate = calculateEngagementRate(videoMetrics);

// //   const youtubeData = await fetchYouTubeChannelData(channelId);
// //   if (!youtubeData) return { status: "api-failure" };

// //   const stats = youtubeData.statistics;
// //   const followers = parseInt(stats?.subscriberCount || "0", 10);
// //   const comments = parseInt(stats?.commentCount || "0", 10);
// //   const videosCount = parseInt(stats?.videoCount || "0", 10);
// //   const safeJson = JSON.parse(JSON.stringify(youtubeData));

// //   const existing = await prisma.brand_social_media_analysis.findFirst({
// //     where: {
// //       website_id: website_id,
// //       platform_name: "YouTube",
// //     },
// //   });

// //   if (existing) {
// //     await prisma.brand_social_media_analysis.update({
// //       where: { social_media_id: existing.social_media_id },
// //       data: {
// //         followers,
// //         comments,
// //         videos_count: videosCount,
// //         posts_count: videosCount,
// //         engagement_rate: engagementRate,
// //         data: safeJson,
// //         updated_at: new Date(),
// //       },
// //     });
// //   } else {
// //     await prisma.brand_social_media_analysis.create({
// //       data: {
// //         website_id: website_id,
// //         platform_name: "YouTube",
// //         followers,
// //         comments,
// //         videos_count: videosCount,
// //         posts_count: videosCount,
// //         engagement_rate: engagementRate,
// //         data: safeJson,
// //       },
// //     });
// //   }

// //   return {
// //     followers,
// //     comments,
// //     videosCount,
// //     engagementRate,
// //     rawData: safeJson,
// //   };
// // }

// // async function resolveYouTubeChannelId(url: string): Promise<string | null> {
// //   const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
// //   if (channelMatch) return channelMatch[1];

// //   const usernameMatch = url.match(/youtube\.com\/(user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
// //   const handle = usernameMatch?.[2];
// //   if (!handle) return null;

// //   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

// //   const response = await youtube.channels.list({ forUsername: handle, part: ["id"] });
// //   if (response.data.items?.[0]?.id) return response.data.items[0].id;

// //   const searchResponse = await youtube.search.list({ q: handle, type: ["channel"], part: ["snippet"], maxResults: 1 });
// //   return searchResponse.data.items?.[0]?.snippet?.channelId || null;
// // }

// // async function fetchYouTubeChannelData(channelId: string) {
// //   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
// //   const response = await youtube.channels.list({ part: ["snippet", "statistics"], id: [channelId] });
// //   return response.data.items?.[0] || null;
// // }

// // async function fetchLastFiveVideos(channelId: string): Promise<string[]> {
// //   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
// //   const response = await youtube.search.list({ channelId, part: ["id"], maxResults: 5, order: "date" });
// //   return response.data.items
// //     ?.map((item) => item.id?.videoId)
// //     .filter((id): id is string => !!id) || [];
// // }

// // async function fetchVideoMetrics(videoIds: string[]) {
// //   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
// //   const response = await youtube.videos.list({ id: videoIds, part: ["statistics"] });
// //   return response.data.items || [];
// // }

// // function calculateEngagementRate(videos: any[]): number {
// //   let totalLikes = 0, totalComments = 0, totalViews = 0;
// //   for (const video of videos) {
// //     const stats = video.statistics;
// //     totalLikes += parseInt(stats?.likeCount || "0", 10);
// //     totalComments += parseInt(stats?.commentCount || "0", 10);
// //     totalViews += parseInt(stats?.viewCount || "0", 10);
// //   }
// //   return totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
// // }



// import { google, youtube_v3 } from "googleapis";
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// // Example usage of YouTube API client (remove or move inside a function as needed):
// // If you need to test the YouTube API client, wrap the code in an async function like this:
// // (Uncomment and use as needed)
// /*
// async function exampleYouTubeSearch(channelId: string, publishedAfter: string, nextPageToken?: string) {
//   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
//   const res = await youtube.search.list({
//     channelId,
//     part: ["id", "snippet"],
//     maxResults: 50,
//     order: "date",
//     publishedAfter,
//     pageToken: nextPageToken,
//   });
//   const searchListResponse: youtube_v3.Schema$SearchListResponse = res.data;
//   return searchListResponse;
// }
// */

// export async function analyzeYouTubeDataByWebsiteId(website_id: string) {
//   const scrapedData = await prisma.website_scraped_data.findUnique({
//     where: { website_id: website_id },
//   });

//   if (!scrapedData?.youtube_handle) {
//     return { status: "no-youtube-handle" };
//   }

//   const youtubeUrl = scrapedData.youtube_handle;
//   const channelId = await resolveYouTubeChannelId(youtubeUrl);
//   if (!channelId) return { status: "invalid-channel" };

//   const videoIdsAndDates = await fetchVideosLast30Days(channelId);
//   if (videoIdsAndDates.length === 0) return { status: "no-videos-found" };

//   const videoIds = videoIdsAndDates.map(v => v.videoId);
//   const videoStats = await fetchVideoMetrics(videoIds);

//   // Attach publish dates to stats
//   const videoMetrics = videoStats.map((v) => {
//     const match = videoIdsAndDates.find(x => x.videoId === v.id);
//     return { ...v, publishedAt: match?.publishedAt };
//   });

//   const engagementRate = calculateEngagementRate(videoMetrics);
//   const graphData = aggregateDailyMetrics(videoMetrics);

//   const youtubeData = await fetchYouTubeChannelData(channelId);
//   if (!youtubeData) return { status: "api-failure" };

//   const stats = youtubeData.statistics;
//   const followers = parseInt(stats?.subscriberCount || "0", 10);
//   const comments = parseInt(stats?.commentCount || "0", 10);
//   const videosCount = parseInt(stats?.videoCount || "0", 10);
//   const safeJson = JSON.parse(JSON.stringify(youtubeData));

//   const existing = await prisma.brand_social_media_analysis.findFirst({
//     where: { website_id, platform_name: "YouTube" },
//   });

//   if (existing) {
//     await prisma.brand_social_media_analysis.update({
//       where: { social_media_id: existing.social_media_id },
//       data: {
//         followers,
//         comments,
//         videos_count: videosCount,
//         posts_count: videosCount,
//         engagement_rate: engagementRate,
//         data: safeJson,
//         updated_at: new Date(),
//       },
//     });
//   } else {
//     await prisma.brand_social_media_analysis.create({
//       data: {
//         website_id,
//         platform_name: "YouTube",
//         followers,
//         comments,
//         videos_count: videosCount,
//         posts_count: videosCount,
//         engagement_rate: engagementRate,
//         data: safeJson,
//       },
//     });
//   }

//   return {
//     followers,
//     comments,
//     videosCount,
//     engagementRate,
//     graphData, // ✅ daily breakdown
//     rawData: safeJson,
//   };
// }

// // === Utility Functions ===

// async function resolveYouTubeChannelId(url: string): Promise<string | null> {
//   const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
//   if (channelMatch) return channelMatch[1];

//   const usernameMatch = url.match(/youtube\.com\/(user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
//   const handle = usernameMatch?.[2];
//   if (!handle) return null;

//   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
//   const response = await youtube.channels.list({ forUsername: handle, part: ["id"] });
//   if (response.data.items?.[0]?.id) return response.data.items[0].id;

//   const searchResponse = await youtube.search.list({ q: handle, type: ["channel"], part: ["snippet"], maxResults: 1 });
//   return searchResponse.data.items?.[0]?.snippet?.channelId || null;
// }

// async function fetchYouTubeChannelData(channelId: string) {
//   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
//   const response = await youtube.channels.list({ part: ["snippet", "statistics"], id: [channelId] });
//   return response.data.items?.[0] || null;
// }

// async function fetchVideosLast30Days(channelId: string): Promise<{ videoId: string, publishedAt: string }[]> {
//   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
//   const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

//   let nextPageToken: string | undefined = undefined;
//   const videos: { videoId: string, publishedAt: string }[] = [];

//   do {
//     const res = await youtube.search.list({
//       channelId,
//       part: ["id", "snippet"],
//       maxResults: 50,
//       order: "date",
//       publishedAfter,
//       pageToken: nextPageToken,
//     });

//     const items = res.data.items || [];
//     for (const item of items) {
//       const videoId = item.id?.videoId;
//       const publishedAt = item.snippet?.publishedAt;
//       if (videoId && publishedAt) {
//         videos.push({ videoId, publishedAt });
//       }
//     }

//     nextPageToken = res.data.nextPageToken ?? undefined;
//   } while (nextPageToken);

//   return videos;
// }

// async function fetchVideoMetrics(videoIds: string[]) {
//   const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
//   const allStats = [];
//   for (let i = 0; i < videoIds.length; i += 50) {
//     const chunk = videoIds.slice(i, i + 50);
//     const response = await youtube.videos.list({ id: chunk, part: ["statistics"] });
//     allStats.push(...(response.data.items || []));
//   }
//   return allStats;
// }

// function calculateEngagementRate(videos: any[]): number {
//   let totalLikes = 0, totalComments = 0, totalViews = 0;
//   for (const video of videos) {
//     const stats = video.statistics;
//     totalLikes += parseInt(stats?.likeCount || "0", 10);
//     totalComments += parseInt(stats?.commentCount || "0", 10);
//     totalViews += parseInt(stats?.viewCount || "0", 10);
//   }
//   return totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
// }

// function aggregateDailyMetrics(videos: any[]) {
//   const result: Record<string, { views: number; likes: number; comments: number; engagementRate: number }> = {};

//   for (const video of videos) {
//     const publishedAt = video.publishedAt;
//     const date = publishedAt?.split("T")[0]; // YYYY-MM-DD
//     if (!date) continue;

//     const stats = video.statistics;
//     const views = parseInt(stats?.viewCount || "0", 10);
//     const likes = parseInt(stats?.likeCount || "0", 10);
//     const comments = parseInt(stats?.commentCount || "0", 10);

//     if (!result[date]) {
//       result[date] = { views: 0, likes: 0, comments: 0, engagementRate: 0 };
//     }

//     result[date].views += views;
//     result[date].likes += likes;
//     result[date].comments += comments;

//     const totalViews = result[date].views;
//     const totalLikes = result[date].likes;
//     const totalComments = result[date].comments;

//     result[date].engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
//   }

//   return result;
// }



import { google, youtube_v3 } from "googleapis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function analyzeYouTubeDataByWebsiteId(website_id: string) {
  const scrapedData = await prisma.website_scraped_data.findUnique({
    where: { website_id },
  });

  if (!scrapedData?.youtube_handle) {
    return { status: "no-youtube-handle" };
  }

  const youtubeUrl = scrapedData.youtube_handle;
  const channelId = await resolveYouTubeChannelId(youtubeUrl);
  if (!channelId) return { status: "invalid-channel" };

  const videoIdsAndDates = await fetchVideosLast30Days(channelId);
  if (videoIdsAndDates.length === 0) return { status: "no-videos-found" };

  const videoIds = videoIdsAndDates.map(v => v.videoId);
  const videoStats = await fetchVideoMetrics(videoIds);

  // Attach publish dates to stats
  const videoMetrics = videoStats.map((v) => {
    const match = videoIdsAndDates.find(x => x.videoId === v.id);
    return { ...v, publishedAt: match?.publishedAt };
  });

  const engagementRate = calculateEngagementRate(videoMetrics);
  const graphData = aggregateDailyMetrics(videoMetrics);

  const youtubeData = await fetchYouTubeChannelData(channelId);
  if (!youtubeData) return { status: "api-failure" };

  const stats = youtubeData.statistics;
  const followers = parseInt(stats?.subscriberCount || "0", 10);
  const comments = parseInt(stats?.commentCount || "0", 10);
  const videosCount = parseInt(stats?.videoCount || "0", 10);
  const safeJson = JSON.parse(JSON.stringify(youtubeData));

  const existing = await prisma.brand_social_media_analysis.findFirst({
    where: { website_id, platform_name: "YouTube" },
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
        website_id,
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
    graphData,
    rawData: safeJson,
  };
}

// === Utility Functions ===

async function resolveYouTubeChannelId(url: string): Promise<string | null> {
  const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) return channelMatch[1];

  const usernameMatch = url.match(/youtube\.com\/(?:user|c|@)?\/?([a-zA-Z0-9_\-@]+)/);
  const handle = usernameMatch?.[1];
  if (!handle) return null;

  const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });

  const res = await youtube.channels.list({ forUsername: handle, part: ["id"] });
  const data: youtube_v3.Schema$ChannelListResponse = res.data;

  if (data.items?.[0]?.id) return data.items[0].id;

  const searchRes = await youtube.search.list({
    q: handle,
    type: ["channel"],
    part: ["snippet"],
    maxResults: 1,
  });
  const searchData: youtube_v3.Schema$SearchListResponse = searchRes.data;

  return searchData.items?.[0]?.snippet?.channelId || null;
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

function calculateEngagementRate(videos: youtube_v3.Schema$Video[]): number {
  let totalLikes = 0, totalComments = 0, totalViews = 0;

  for (const video of videos) {
    const stats = video.statistics;
    totalLikes += parseInt(stats?.likeCount || "0", 10);
    totalComments += parseInt(stats?.commentCount || "0", 10);
    totalViews += parseInt(stats?.viewCount || "0", 10);
  }

  return totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
}

function aggregateDailyMetrics(videos: (youtube_v3.Schema$Video & { publishedAt?: string })[]) {
  const result: Record<string, { views: number; likes: number; comments: number; engagementRate: number }> = {};

  for (const video of videos) {
    const publishedAt = video.publishedAt;
    const date = publishedAt?.split("T")[0]; // YYYY-MM-DD
    if (!date) continue;

    const stats = video.statistics;
    const views = parseInt(stats?.viewCount || "0", 10);
    const likes = parseInt(stats?.likeCount || "0", 10);
    const comments = parseInt(stats?.commentCount || "0", 10);

    if (!result[date]) {
      result[date] = { views: 0, likes: 0, comments: 0, engagementRate: 0 };
    }

    result[date].views += views;
    result[date].likes += likes;
    result[date].comments += comments;

    const totalViews = result[date].views;
    const totalLikes = result[date].likes;
    const totalComments = result[date].comments;

    result[date].engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
  }

  return result;
}
