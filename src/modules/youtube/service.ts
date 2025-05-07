// // import axios from "axios";

// // export async function fetchYoutubeStats(channelId: string) {
// //   const API_KEY = process.env.YOUTUBE_API_KEY;
// //   console.log("in feecth youtube stat")
// //   const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${API_KEY}`;

// //   const response = await axios.get(url);

// //   const channel = response.data.items?.[0];
// //   if (!channel) throw new Error("Channel not found");

// //   const stats = channel.statistics;
// //   const snippet = channel.snippet;

// //   return {
// //     followers: parseInt(stats.subscriberCount || "0"),
// //     likes: 0, // YouTube API does not provide likes at channel level
// //     comments: 0,
// //     shares: 0,
// //     videos_count: parseInt(stats.videoCount || "0"),
// //     engagement_rate: 0, // You’ll calculate this based on views, likes, etc., if needed
// //     platform_name: "youtube",
// //     data: {
// //       title: snippet.title,
// //       description: snippet.description,
// //       country: snippet.country,
// //     }
// //   };
// // }


// import axios from "axios";

// export async function fetchYoutubeStats(channelId: string) {
//   const API_KEY = process.env.YOUTUBE_API_KEY;
//   if (!API_KEY) throw new Error("YouTube API key is not set");

//   // Fetch channel stats
//   const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${API_KEY}`;
//   const channelResponse = await axios.get(channelUrl);
//   const channel = channelResponse.data.items?.[0];
//   if (!channel) throw new Error("Channel not found");

//   const channelStats = channel.statistics;
//   const channelSnippet = channel.snippet;

//   // Fetch videos from the past 30 days
//   const thirtyDaysAgo = new Date();
//   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//   const publishedAfter = thirtyDaysAgo.toISOString();

//   const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&publishedAfter=${publishedAfter}&type=video&key=${API_KEY}`;
//   const searchResponse = await axios.get(searchUrl);
//   const videos = searchResponse.data.items;

//   let mostLikedVideo = null;
//   let mostCommentedVideo = null;

//   if (videos && videos.length > 0) {
//     const videoIds = videos.map((video: any) => video.id.videoId).join(",");
//     const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`;
//     const videosResponse = await axios.get(videosUrl);
//     const videoDetails = videosResponse.data.items;

//     if (videoDetails && videoDetails.length > 0) {
//       mostLikedVideo = videoDetails.reduce((prev: any, current: any) => {
//         const prevLikes = parseInt(prev.statistics.likeCount || "0");
//         const currentLikes = parseInt(current.statistics.likeCount || "0");
//         return currentLikes > prevLikes ? current : prev;
//       });

//       mostCommentedVideo = videoDetails.reduce((prev: any, current: any) => {
//         const prevComments = parseInt(prev.statistics.commentCount || "0");
//         const currentComments = parseInt(current.statistics.commentCount || "0");
//         return currentComments > prevComments ? current : prev;
//       });
//     }
//   }

//   return {
//     followers: parseInt(channelStats.subscriberCount || "0"),
//     videos_count: parseInt(channelStats.videoCount || "0"),
//     engagement_rate: 0, // Calculate if needed
//     platform_name: "youtube",
//     data: {
//       channelTitle: channelSnippet.title,
//       description: channelSnippet.description,
//       country: channelSnippet.country,
//       mostLikedVideo: mostLikedVideo
//         ? {
//             videoId: mostLikedVideo.id,
//             title: mostLikedVideo.snippet.title,
//             description: mostLikedVideo.snippet.description,
//             publishedAt: mostLikedVideo.snippet.publishedAt,
//             likes: parseInt(mostLikedVideo.statistics.likeCount || "0"),
//             views: parseInt(mostLikedVideo.statistics.viewCount || "0"),
//             comments: parseInt(mostLikedVideo.statistics.commentCount || "0"),
//             thumbnail: mostLikedVideo.snippet.thumbnails?.default?.url || "",
//           }
//         : null,
//       mostCommentedVideo: mostCommentedVideo
//         ? {
//             videoId: mostCommentedVideo.id,
//             title: mostCommentedVideo.snippet.title,
//             description: mostCommentedVideo.snippet.description,
//             publishedAt: mostCommentedVideo.snippet.publishedAt,
//             likes: parseInt(mostCommentedVideo.statistics.likeCount || "0"), // Fixed
//             views: parseInt(mostCommentedVideo.statistics.viewCount || "0"), // Fixed
//             comments: parseInt(mostCommentedVideo.statistics.commentCount || "0"), // Fixed
//             thumbnail: mostCommentedVideo.snippet.thumbnails?.default?.url || "",
//           }
//         : null,
//     },
//   };
// }

import axios from "axios";

export async function fetchYoutubeStats(channelId: string) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  if (!API_KEY) throw new Error("YouTube API key is not set");

  // Fetch channel stats using only channelId
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${API_KEY}`;
  const channelResponse = await axios.get(channelUrl);
  const channel = channelResponse.data.items?.[0];
  if (!channel) throw new Error("Channel not found");

  const channelStats = channel.statistics;
  const channelSnippet = channel.snippet;

  // Fetch videos from the past 30 days using channelId
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const publishedAfter = thirtyDaysAgo.toISOString();

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&publishedAfter=${publishedAfter}&type=video&key=${API_KEY}`;
  const searchResponse = await axios.get(searchUrl);
  const videos = searchResponse.data.items;

  let mostLikedVideo = null;
  let mostCommentedVideo = null;
  let engagement_rate = 0;

  if (videos && videos.length > 0) {
    const videoIds = videos.map((video: any) => video.id.videoId).join(",");
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`;
    const videosResponse = await axios.get(videosUrl);
    const videoDetails = videosResponse.data.items;

    if (videoDetails && videoDetails.length > 0) {
      mostLikedVideo = videoDetails.reduce((prev: any, current: any) => {
        const prevLikes = parseInt(prev.statistics.likeCount || "0");
        const currentLikes = parseInt(current.statistics.likeCount || "0");
        return currentLikes > prevLikes ? current : prev;
      });

      mostCommentedVideo = videoDetails.reduce((prev: any, current: any) => {
        const prevComments = parseInt(prev.statistics.commentCount || "0");
        const currentComments = parseInt(current.statistics.commentCount || "0");
        return currentComments > prevComments ? current : prev;
      });

      // Calculate engagement rate for most-liked video
      if (mostLikedVideo) {
        const likes = parseInt(mostLikedVideo.statistics.likeCount || "0");
        const comments = parseInt(mostLikedVideo.statistics.commentCount || "0");
        const views = parseInt(mostLikedVideo.statistics.viewCount || "0");
        engagement_rate = views > 0 ? ((likes + comments) / views) * 100 : 0;
      }
    }
  }

  return {
    followers: parseInt(channelStats.subscriberCount || "0"),
    videos_count: parseInt(channelStats.videoCount || "0"),
    engagement_rate: parseFloat(engagement_rate.toFixed(2)), // Round to 2 decimal places
    platform_name: "youtube",
    data: {
      channelTitle: channelSnippet.title,
      description: channelSnippet.description,
      country: channelSnippet.country,
      mostLikedVideo: mostLikedVideo
        ? {
            videoId: mostLikedVideo.id,
            title: mostLikedVideo.snippet.title,
            description: mostLikedVideo.snippet.description,
            publishedAt: mostLikedVideo.snippet.publishedAt,
            likes: parseInt(mostLikedVideo.statistics.likeCount || "0"),
            views: parseInt(mostLikedVideo.statistics.viewCount || "0"),
            comments: parseInt(mostLikedVideo.statistics.commentCount || "0"),
            thumbnail: mostLikedVideo.snippet.thumbnails?.default?.url || "",
          }
        : null,
      mostCommentedVideo: mostCommentedVideo
        ? {
            videoId: mostCommentedVideo.id,
            title: mostCommentedVideo.snippet.title,
            description: mostCommentedVideo.snippet.description,
            publishedAt: mostCommentedVideo.snippet.publishedAt,
            likes: parseInt(mostCommentedVideo.statistics.likeCount || "0"),
            views: parseInt(mostCommentedVideo.statistics.viewCount || "0"),
            comments: parseInt(mostCommentedVideo.statistics.commentCount || "0"),
            thumbnail: mostCommentedVideo.snippet.thumbnails?.default?.url || "",
          }
        : null,
    },
  };
}