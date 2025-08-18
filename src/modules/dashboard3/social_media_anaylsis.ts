import { getFacebookPostsFromScrapedData } from "../dashboard2/facebook/facebook.service";
import { getInstagramPostsFromScrapedData } from "../dashboard2/instagram/instagram.service";
import {analyzeYouTubeDataByWebsiteId} from "../dashboard2/youtube/youtube_service"

import { getlinkedinProfileFromScrapedData } from '../dashboard2/linkedlin/linkedlin_service';
import { getgoogleAds } from '../dashboard2/google_ads/google_ads_service';
import { getfacebookAds } from '../dashboard2/facebook_ads/facebook_ads_service';

export async function fetchSocialMediaData(
  facebookHandle: any,
  instagramHandle: any,
  youtubeHandle: any, 
  linkedlin_handle:any,
  website_url: string | null = null
): Promise<any> {
  try {
     console.log("🔍 Fetching social media data with handles:");
    console.log("📘 Facebook Handle:", facebookHandle);
    console.log("📸 Instagram Handle:", instagramHandle);
    console.log("📺 YouTube Handle:", youtubeHandle);
    const tasks: Promise<any>[] = [];
    const results: Record<string, any> = {};

    if (facebookHandle != null) {
      tasks.push(
        getFacebookPostsFromScrapedData(facebookHandle).then(data => {
          results.facebook_data = data;
        })
      );
    }

    if (instagramHandle != null) {
      tasks.push(
        getInstagramPostsFromScrapedData(instagramHandle).then(data => {
          results.instagram_data = data;
        })
      );
    }

    if (youtubeHandle != null) {
      
      tasks.push(
        analyzeYouTubeDataByWebsiteId(youtubeHandle).then(data => {
          results.youtube_data = data;
        })
      );
    }  

    if (linkedlin_handle != null){
      tasks.push(
        getlinkedinProfileFromScrapedData(linkedlin_handle).then(data => {
          results.linkedlin_data = data;
        })
      );
    }

     if (website_url != null){
      tasks.push(
        getgoogleAds(website_url).then(data => {
          results.google_ads_data = data;
          
        }),
        getfacebookAds(website_url).then(data => {
          results.facebook_ads_data = data;
          
        })


      );
    }

    await Promise.all(tasks);
   
    const { facebook_data, instagram_data, youtube_data } = results;

    const hasData = facebook_data || instagram_data || youtube_data || results.linkedlin_data || results.google_ads_data || results.facebook_ads_data;

    const social_media_analysis = {
      ...(facebook_data || {}),
      ...(instagram_data || {}),
      ...(youtube_data || {}),
      ...(results.linkedlin_data || {}),
      ...(results.google_ads_data || {}),
      ...results.facebook_ads_data || {}
    };

    return hasData
      ? { status: "success", social_media_analysis }
      : { status: "no-data" };

  } catch (error) {
    console.error("Error fetching social media data:", error);
    return { status: "error", error: "Failed to fetch social media data" };
  }
}
