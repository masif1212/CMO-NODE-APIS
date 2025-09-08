


import { getFacebookPostsFromScrapedData } from "../dashboard2/facebook/facebook.service";
import { getInstagramPostsFromScrapedData } from "../dashboard2/instagram/instagram.service";
import { analyzeYouTubeDataByWebsiteId } from "../dashboard2/youtube/youtube_service";
import { getlinkedinProfileFromScrapedData } from "../dashboard2/linkedlin/linkedlin_service";
import { getgoogleAds } from "../dashboard2/google_ads/google_ads_service";
import { getfacebookAds } from "../dashboard2/facebook_ads/facebook_ads_service";

export async function fetchSocialMediaData(
  facebookHandle: any,
  instagramHandle: any,
  youtubeHandle: any,
  linkedinHandle: any,
  website_url: any | null = null
): Promise<any> {
  try {
    console.log("🔍 Fetching social media data for website:", website_url);

    const results: Record<string, any> = {};
    const tasks: Promise<void>[] = [];

    if (facebookHandle) {
      tasks.push(
        getFacebookPostsFromScrapedData(facebookHandle)
          .then(data => { results.facebook_data = data; })
          .catch(err => { results.facebook_data = formatError(err, "facebook"); })
      );
    }

    if (instagramHandle) {
      tasks.push(
        getInstagramPostsFromScrapedData(instagramHandle)
          .then(data => { results.instagram_data = data; })
          .catch(err => { results.instagram_data = formatError(err, "instagram"); })
      );
    }

    if (youtubeHandle) {
      tasks.push(
        analyzeYouTubeDataByWebsiteId(youtubeHandle)
          .then(data => { results.youtube_data = data; })
          .catch(err => { results.youtube_data = formatError(err, "youtube"); })
      );
    }

    if (linkedinHandle) {
      tasks.push(
        getlinkedinProfileFromScrapedData(linkedinHandle)
          .then(data => { results.linkedin_data = data; })
          .catch(err => { results.linkedin_data = formatError(err, "linkedin"); })
      );
    }

    if (website_url) {
      tasks.push(
        getgoogleAds(website_url)
          .then(data => { results.google_ads_data = data; })
          .catch(err => { results.google_ads_data = formatError(err, "google_ads"); }),

        getfacebookAds(website_url)
          .then(data => { results.facebook_ads_data = data; })
          .catch(err => { results.facebook_ads_data = formatError(err, "facebook_ads"); })
      );
    }

    await Promise.all(tasks);

    const social_media_analysis = {
      ...(results.facebook_data || {}),
      ...(results.instagram_data || {}),
      ...(results.youtube_data || {}),
      ...(results.linkedin_data || {}),
      ...(results.google_ads_data || {}),
      ...(results.facebook_ads_data || {}),
    };

    const hasData = Object.keys(social_media_analysis).length > 0;

    return hasData
      ? { status: "success", social_media_analysis }
      : { status: "no-data" };

  } catch (error) {
    console.error("❌ Error fetching social media data:", error);
    return { status: "error", error: formatError(error, "system") };
  }
}

// 🔹 Helper to normalize errors
function formatError(err: any, source: string) {
  if (err?.response?.data) {
    return {
      success: false,
      error: err.response.data.error || "scrape_failed",
      errorStatus: err.response.status || 500,
      message: err.response.data.message || `Failed to fetch ${source} data`,
    };
  }

  return {
    success: false,
    error: err?.message || "unknown_error",
    errorStatus: err?.status || 500,
    message: `Error fetching ${source} data`,
  };
}
