
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import logging from './logger'; 
const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const INSTAGRAM_PROFILE_URL = process.env.Instagram_PROFILE_ULR;
const INSTAGRAM_POST_URL = process.env.Instagram_POST_URL;






const headers = {
  accept: 'application/json',
  'x-api-key': API_KEY,
};

const extractInstagramUsername = (input: string): string => {
  try {
    const url = new URL(input);
    return url.pathname.replace(/\//g, ''); // removes all "/"
  } catch {
    return input.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
  }
};



export const getInstagramPostsFromScrapedData = async (handle: string, max_posts: number = 10, retry_attempts: number = 2, delay: number = 2) => {
  // Validate environment variables
  if (!API_KEY) {
    return { error: 'SCRAPPER_CREATOR_APIKEY environment variable is not set' };
  }
handle = extractInstagramUsername(handle);  
const get_instagram_profile = async (handle: string) => {

    const url = `${INSTAGRAM_PROFILE_URL}?handle=${handle}`;
    console.log("url",url)

    try {
      const response = await axios.get(url, { headers });
      const profile_info = response.data?.data?.user || {};

      return {
        username: profile_info.username || 'N/A',
        full_name: profile_info.full_name || 'N/A',
        biography: profile_info.biography || 'N/A',
        bio_links: (profile_info.bio_links || []).map((link: any) => ({
          title: link.title || 'No Title',
          url: link.url || 'No URL',
        })),
        followers_count: profile_info.edge_followed_by?.count || 0,
        following_count: profile_info.edge_follow?.count || 0,
        external_url: profile_info.external_url || 'N/A',
        profile_picture_url: profile_info.profile_pic_url_hd || 'N/A',
      };
    } catch (error: any) {
      logging.error(`Failed to fetch profile: ${error.message}`);
      return { error: `Failed to fetch profile: ${error.message}` };
    }
  };

  const format_timestamp = (unix_timestamp: number) => {
    try {
      const date = new Date(unix_timestamp * 1000); // Convert seconds to milliseconds
      const zonedDate = toZonedTime(date, 'UTC');
      return format(zonedDate, 'dd-MM-yyyy HH:mm:ss');
    } catch (error: any) {
      logging.error(`Error formatting timestamp: ${error.message}`);
      return null;
    }
  };

  try {
    const profile = await get_instagram_profile(handle);
    if ('error' in profile) {
      return { error: profile.error };
    }
    console.log("profile",profile)
    let total_posts = 0;
    let total_engagement = 0;
    let posts: any[] = [];
    let cursor: string | null = null;
    let attempt = 0;
    let previous_cursor: string | null = null;
    let empty_post_retries = 3;


    
    while (total_posts < max_posts && empty_post_retries > 0) {
      const url = cursor ? `${INSTAGRAM_POST_URL}?handle=${handle}&cursor=${cursor}` : `${INSTAGRAM_POST_URL}?handle=${handle}`;
      console.log("url_post",url)

      try {
        console.log(`Fetching posts... Current total: ${total_posts}, Cursor: ${cursor}`);
        let response : any = await axios.get(url, { headers });
        // console.log("post api response",response)
        // response = requests.get(url, headers=headers, timeout=30) 
        // response.raise_for_status()  
        response = response.json()
        const response_data = response.items;
        posts = response.get("posts", [])
        console.log("posts",posts

        )
        const fetched_posts = response_data.posts || [];

        if (!fetched_posts.length) {
          empty_post_retries--;
          console.log(`No posts found. Retrying... ${empty_post_retries} attempts remaining.`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          continue;
        } else {
          empty_post_retries = 3;
        }

        for (const post of fetched_posts) {
          if (total_posts >= max_posts) break;

          const node = post.node || {};
          const post_id = node.id;
          const likes = node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0;
          const comments_disabled = node.comments_disabled || true;
          const comments = comments_disabled ? 0 : node.edge_media_to_comment?.count || 0;

          const post_data = {
            post_id,
            shortcode: node.shortcode || '',
            is_video: node.is_video || false,
            post_type: node.is_video ? 'video' : 'image', // Instagram posts are typically image or video
            likes,
            comments,
            caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
            timestamp: node.taken_at_timestamp ? format_timestamp(node.taken_at_timestamp) : null,
            display_url: node.display_url || '',
          };

          posts.push(post_data);
          total_engagement += likes + comments;
          total_posts++;
        }

        previous_cursor = cursor;
        cursor = response_data.cursor || null;
        console.log(`Next cursor: ${cursor}`);

        if (!cursor || cursor === previous_cursor) {
          console.log('No further pagination possible or cursor did not change.');
          break;
        }

        attempt = 0;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } catch (error: any) {
        if (attempt < retry_attempts) {
          attempt++;
          const retry_delay = delay * attempt;
          console.log(`Error fetching posts: ${error.message}. Retrying in ${retry_delay} seconds... (Attempt ${attempt}/${retry_attempts})`);
          await new Promise(resolve => setTimeout(resolve, retry_delay * 1000));
          continue;
        } else {
          logging.error(`Max retry attempts reached. Error fetching posts: ${error.message}`);
          return { error: `Max retry attempts reached. Error fetching posts: ${error.message}` };
        }
      }
    }

    const calculateEngagementStats = (posts: any[], followerCount: number) => {
      if (!followerCount || followerCount === 0) {
        return {
          engagementRate: '0.00%',
          engagementToFollowerRatio: '0.0000',
          perPostEngagement: [],
        };
      }

      let count = 0;
      const perPostEngagement = [];

      for (const post of posts) {
        const engagement = post.likes + post.comments;
        const postEngagementRate = (engagement / followerCount) * 100;

        console.log(`Post ID: ${post.post_id}, PostType: ${post.post_type}, Likes: ${post.likes}, Comments: ${post.comments}`);

        perPostEngagement.push({
          postId: post.post_id,
          postUrl: post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : '',
          publishTime: post.timestamp,
          postType: post.post_type,
          engagementRate: postEngagementRate.toFixed(2) + '%',
          engagementToFollowerRatio: (engagement / followerCount).toFixed(4),
          likes: post.likes,
          comments: post.comments,
        });

        count++;
      }

      const avgEngagement = count > 0 ? total_engagement / count : 0;
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

    const followerCount = Number(profile.followers_count) || 0;
    const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } = calculateEngagementStats(posts, followerCount);

    return {
      profile,
      engagementRate,
      message,
      engagementToFollowerRatio,
      perPostEngagement,
      posts,
    };
  } catch (error: any) {
    logging.error(`Failed to fetch data: ${error.message}`);
    return { error: `Failed to fetch data: ${error.message}` };
  }
};


