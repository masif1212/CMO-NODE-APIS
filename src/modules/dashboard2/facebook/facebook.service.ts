
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const FACEBOOK_PROFILE_URL = process.env.FACEBOOK_PROFILE_ULR;
const FACEBOOK_POST_URL = process.env.FACEBOOK_POST_URL;

const headers = { 'x-api-key': API_KEY };





export const getFacebookPostsFromScrapedData = async (facebook_handle: string) => {
  const handle = facebook_handle.trim();
  const isPageId = /^\d+$/.test(handle);

  const queryParam = isPageId
    ? `pageId=${handle}`
    : `url=https://${handle.replace(/^https?:\/\//, '')}`;

  const url = `${FACEBOOK_POST_URL}?${queryParam}`;
  const profile = await getFacebookProfileFromScrapedData(facebook_handle);

  try {
    const response = await axios.get(url, { headers });
    const posts = response.data?.posts || [];

    // Small delay for rate limit handling
    await new Promise(resolve => setTimeout(resolve, 1500));

    const calculateEngagementStats = (posts: any[], followerCount: number) => {
      if (!followerCount || followerCount === 0) {
        return {
          engagementRate: '0.00%',
          engagementToFollowerRatio: '0.0000',
          perPostEngagement: [],
        };
      }

      let totalEngagement = 0;
      let count = 0;
      const perPostEngagement = [];

      for (const post of posts) {
        const reactions = Number(post.reactionCount || 0);
        const comments = Number(post.commentCount || 0);
        const engagement = reactions + comments;

        totalEngagement += engagement;
        count++;

        // Determine post type (video, image, text, etc.)
        let postType = 'text'; // Default to text
        if (post.videoDetails && Object.keys(post.videoDetails).length > 0) {
          postType = 'video';
        } else if (post.url && post.url.includes('/videos/')) {
          postType = 'video';
        } else if (post.thumbnailUrl || (post.attachments && post.attachments.some((a: any) => a.type === 'photo'))) {
          postType = 'image'; // Adjust based on actual data structure
        }

        // Debugging: Log post details to verify detection
        console.log(`Post ID: ${post.id}, PostType: ${postType}, VideoDetails: ${JSON.stringify(post.videoDetails)}, URL: ${post.url}`);

        // Calculate engagement for all posts
        const postEngagementRate = (engagement / followerCount) * 100;
        perPostEngagement.push({
          postId: post.id,
          postUrl: post.url,
          publishTime: post.publishTime || null,
          postType, // Include post type (video, image, text, etc.)
          engagementRate: postEngagementRate.toFixed(2) + '%',
          engagementToFollowerRatio: (engagement / followerCount).toFixed(4),
          reactions,
          comments,
        });
      }

      if (count === 0) {
        return {
          engagementRate: '0.00%',
          engagementToFollowerRatio: '0.0000',
          perPostEngagement: [],
        };
      }

      const avgEngagement = totalEngagement / count;
      const engagementToFollowerRatio = avgEngagement / followerCount;
      const engagementRate = engagementToFollowerRatio * 100;

      let message = '';
      if (engagementRate >= 1.6) {
        message = 'High engagement—your content resonates.';
      } else if (engagementRate >= 1.1) {
        message = 'Better than most in your industry.';
      } else if (engagementRate >= 0.6) {
        message = 'Standard engagement—room to grow.';
      } else if (engagementRate >= 0.0) {
        message = 'Minimal engagement for your audience size.';
      }

      return {
        engagementRate: engagementRate.toFixed(2) + '%',
        engagementToFollowerRatio: engagementToFollowerRatio.toFixed(4),
        message,
        perPostEngagement,
      };
    };

    const followerCount = Number(profile?.followerCount) || 0;
    const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } = calculateEngagementStats(posts, followerCount);


     const facebook_data = {
      message,

      facebook_handle,
      profile,
      engagementRate,
      engagementToFollowerRatio,
      perPostEngagement
    };
    return {
      facebook_data 
    };
  } catch (error: any) {
    return { error: `Failed to fetch posts: ${error.message}` };
  }
};

export const getFacebookProfileFromScrapedData = async (facebook_handle: string) => {
  const cleanUrl = facebook_handle.trim().replace(/^https?:\/\//, '');
  const url = `${FACEBOOK_PROFILE_URL}?url=https://${cleanUrl}`;

  try {
    const response = await axios.get(url, { headers });
    return extractFacebookProfileInfo(response.data);
  } catch (error: any) {
    return { error: `Failed to fetch profile: ${error.message}` };
  }
};

const extractFacebookProfileInfo = (data: any) => {
  try {
    const profileInfo: Record<string, any> = {
      name: data.name || 'N/A',
      profileUrl: data.url || 'N/A',
      likeCount: data.likeCount || 'N/A',
      followerCount: data.followerCount || 'N/A',
      rating: data.rating || 'N/A',
      ratingCount: data.ratingCount || 'N/A',
      address: data.address || 'N/A',
      email: data.email || 'N/A',
      phone: data.phone || 'N/A',
      website: data.website || 'N/A',
      profilePhotoUrl: data.profilePhoto?.url || 'No profile photo available',
      pageIntroduction: data.pageIntro || 'N/A',
      category: data.category || 'N/A',
      accountStatus: data.account_status || 'N/A',  
      adLibrary : data.adLibrary || 'N/A'
      
    };

    return profileInfo;
  } catch (error: any) {
    return { error: `Error parsing profile info: ${error.message}` };
  }
};
