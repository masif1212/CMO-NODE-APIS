import { getFacebookPostsFromScrapedData } from "../dashboard2/facebook/facebook.service";
import { getInstagramPostsFromScrapedData } from "../dashboard2/instagram/instagram.service";
import {analyzeYouTubeDataByWebsiteId} from "../dashboard2/youtube/youtubeAnalysis"







// export async function fetchSocialMediaData(
//   facebookHandle: any,
//   instagramHandle: any,
//   youtubeHandle: any
// ): Promise<any> {
//   try {
//     const [facebook_data, instagram_data, youtube_data] = await Promise.all([
//       getFacebookPostsFromScrapedData(facebookHandle),
//       getInstagramPostsFromScrapedData(instagramHandle),
//       analyzeYouTubeDataByWebsiteId(youtubeHandle)
//     ]);

//     const social_media_analysis = {
//       ...(facebook_data || {}),
//       ...(instagram_data || {}),
//       ...(youtube_data || {})
//     };

//     const hasData = facebook_data || instagram_data || youtube_data;

//     return hasData
//       ? { status: "success", social_media_analysis }
//       : { status: "no-data" };

//   } catch (error) {
//     console.error("Error fetching social media data:", error);
//     return { status: "error", error: "Failed to fetch social media data" };
//   }
// }



export async function fetchSocialMediaData(
  facebookHandle: any,
  instagramHandle: any,
  youtubeHandle: any
): Promise<any> {
  try {
     console.log("🔍 Fetching social media data with handles:");
    console.log("📘 Facebook Handle:", facebookHandle);
    console.log("📸 Instagram Handle:", instagramHandle);
    console.log("📺 YouTube Handle:", youtubeHandle);
    const tasks: Promise<any>[] = [];
    const results: Record<string, any> = {};

    // if (facebookHandle != null) {
    //   tasks.push(
    //     getFacebookPostsFromScrapedData(facebookHandle).then(data => {
    //       results.facebook_data = data;
    //     })
    //   );
    // }

    // if (instagramHandle != null) {
    //   tasks.push(
    //     getInstagramPostsFromScrapedData(instagramHandle).then(data => {
    //       results.instagram_data = data;
    //     })
    //   );
    // }

    if (youtubeHandle != null) {
      
      tasks.push(
        analyzeYouTubeDataByWebsiteId(youtubeHandle).then(data => {
          results.youtube_data = data;
        })
      );
    }

    await Promise.all(tasks);

    const { facebook_data, instagram_data, youtube_data } = results;

    const hasData = facebook_data || instagram_data || youtube_data;

    const social_media_analysis = {
      ...(facebook_data || {}),
      ...(instagram_data || {}),
      ...(youtube_data || {}),
    };

    return hasData
      ? { status: "success", social_media_analysis }
      : { status: "no-data" };

  } catch (error) {
    console.error("Error fetching social media data:", error);
    return { status: "error", error: "Failed to fetch social media data" };
  }
}
