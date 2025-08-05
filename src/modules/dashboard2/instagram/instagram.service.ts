
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


// export const getInstagramPostsFromScrapedData = async (
//   handle: string,
//   max_posts: number = 3,
//   retry_attempts: number = 0,
//   delay: number = 2
// ) => {
//   // Validate environment variables
//   console.log('Starting getInstagramPostsFromScrapedData with handle:', handle, 'max_posts:', max_posts);
//   if (!API_KEY) {
//     console.log('API_KEY is missing');
//     return { error: 'SCRAPPER_CREATOR_APIKEY environment variable is not set' };
//   }

//   console.log('Extracting Instagram username from handle:', handle);
//   handle = extractInstagramUsername(handle);
//   console.log('Extracted handle:', handle);

//  const headers = { 'x-api-key': API_KEY };
//   console.log('Headers set:', headers);

//   const get_instagram_profile = async (handle: string) => {
//     const url = `${INSTAGRAM_PROFILE_URL}?handle=${handle}`;
//     console.log('Fetching profile from URL:', url);

//     try {
//       console.log('Sending profile request with headers:', headers);
//       const response = await axios.get(url, { headers });
      
//       console.log('Profile response received:', JSON.stringify(response.data, null, 2));
//       const profile_info = response.data?.data?.user || {};
//       console.log('Profile info extracted:', profile_info);

//       return {
//         username: profile_info.username || 'N/A',
//         full_name: profile_info.full_name || 'N/A',
//         biography: profile_info.biography || 'N/A',
//         bio_links: (profile_info.bio_links || []).map((link: any) => ({
//           title: link.title || 'No Title',
//           url: link.url || 'No URL',
//         })),
//         followers_count: profile_info.edge_followed_by?.count || 0,
//         following_count: profile_info.edge_follow?.count || 0,
//         external_url: profile_info.external_url || 'N/A',
//         profile_picture_url: profile_info.profile_pic_url_hd || 'N/A',
//       };
//     } catch (error: any) {
//       console.log('Error fetching profile:', error.message, 'Stack:', error.stack);
//       logging.error(`Failed to fetch profile: ${error.message}`);
//       return { error: `Failed to fetch profile: ${error.message}` };
//     }
//   };

//   const format_timestamp = (unix_timestamp: number) => {
//     console.log('Formatting timestamp:', unix_timestamp);
//     try {
//       const date = new Date(unix_timestamp * 1000); // Convert seconds to milliseconds
//       const zonedDate = toZonedTime(date, 'UTC');
//       const formatted = format(zonedDate, 'dd-MM-yyyy HH:mm:ss');
//       console.log('Formatted timestamp:', formatted);
//       return formatted;
//     } catch (error: any) {
//       console.log('Error formatting timestamp:', error.message);
//       logging.error(`Error formatting timestamp: ${error.message}`);
//       return null;
//     }
//   };

//   try {
//     console.log('Fetching Instagram profile for handle:', handle);
//     const profile = await get_instagram_profile(handle);
//     console.log('Profile fetched:', profile);
//     if ('error' in profile) {
//       console.log('Profile fetch failed with error:', profile.error);
//       return { error: profile.error };
//     }

//     let total_posts = 0;
//     let total_engagement = 0;
//     let posts: any[] = [];
//     let cursor: string | null = null;
//     let attempt = 0;
//     let previous_cursor: string | null = null;
//     let empty_post_retries = 3;
//     console.log('Initialized variables: total_posts:', total_posts, 'total_engagement:', total_engagement, 'posts:', posts, 'cursor:', cursor, 'empty_post_retries:', empty_post_retries);

//     let last_response_data = null; // Store the last API response for posts

//     while (total_posts < max_posts && empty_post_retries > 0) {
//       const url: any = cursor
//         ? `${INSTAGRAM_POST_URL}?handle=${handle}&cursor=${cursor}`
//         : `${INSTAGRAM_POST_URL}?handle=${handle}`;
//       console.log('Fetching posts from URL:', url);

//       try {
//         console.log(`Fetching posts... Current total: ${total_posts}, Cursor: ${cursor}, Attempt: ${attempt + 1}`);
//         const response = await axios.get(url, { headers });
//         console.log('Posts response received:', JSON.stringify(response.data, null, 2));
//         const response_data = response.data;
//         last_response_data = response_data; // Store the response data

//         // Extract posts from response.data.items
//         const fetched_posts = response_data.items || [];
//         console.log('Fetched posts:', fetched_posts);

//         if (!fetched_posts.length) {
//           empty_post_retries--;
//           console.log(`No posts found. Retrying... ${empty_post_retries} attempts remaining.`);
//           await new Promise(resolve => setTimeout(resolve, delay * 1000));
//           continue;
//         } else {
//           console.log('Posts found, resetting empty_post_retries to 3');
//           empty_post_retries = 3;
//         }

//         for (const post of fetched_posts) {
//           if (total_posts >= max_posts) {
//             console.log('Max posts limit reached:', max_posts);
//             break;
//           }

//           console.log('Processing post:', post);
//           const post_id = post.id || post.pk;
//           const likes = post.like_count || 0;
//           const comments_disabled = post.commenting_disabled || true;
//           const comments = comments_disabled ? 0 : post.comment_count || 0;

//           const post_data = {
//             post_id,
//             shortcode: post.code || '',
//             is_video: post.media_type === 2 || false,
//             post_type: post.media_type === 2 ? 'video' : 'image',
//             likes,
//             comments,
//             caption: post.caption?.text || '',
//             timestamp: post.taken_at ? format_timestamp(post.taken_at) : null,
//             display_url: post.display_uri || '',
//           };
//           console.log('Post data created:', post_data);

//           posts.push(post_data);
//           total_engagement += likes + comments;
//           total_posts++;
//           console.log('Post added. Updated totals: total_posts:', total_posts, 'total_engagement:', total_engagement);
//         }

//         previous_cursor = cursor;
//         cursor = response_data.profile_grid_items_cursor || null;
//         console.log(`Previous cursor: ${previous_cursor}, Next cursor: ${cursor}`);

//         if (!cursor || cursor === previous_cursor) {
//           console.log('No further pagination possible or cursor did not change.');
//           break;
//         }

//         attempt = 0;
//         console.log('Resetting attempt counter to 0');
//         await new Promise(resolve => setTimeout(resolve, delay * 1000));
//       } catch (error: any) {
//         console.log('Error fetching posts:', error.message, 'Stack:', error.stack);
//         if (attempt < retry_attempts) {
//           attempt++;
//           const retry_delay = delay * attempt;
//           console.log(`Retrying in ${retry_delay} seconds... (Attempt ${attempt}/${retry_attempts})`);
//           await new Promise(resolve => setTimeout(resolve, retry_delay * 1000));
//           continue;
//         } else {
//           console.log('Max retry attempts reached:', retry_attempts);
//           logging.error(`Max retry attempts reached. Error fetching posts: ${error.message}`);
//           return {
//             profile,
//             error: `Max retry attempts reached. Error fetching posts: ${error.message}`,
//             post_api_response: last_response_data || null,
//             posts: posts.length ? posts : null,
//           };
//         }
//       }
//     }

//     const calculateEngagementStats = (posts: any[], followerCount: number) => {
//       console.log('Calculating engagement stats for posts:', posts, 'followerCount:', followerCount);
//       if (!followerCount || followerCount === 0) {
//         console.log('No followers, returning default stats');
//         return {
//           engagementRate: '0.00%',
//           engagementToFollowerRatio: '0.0000',
//           perPostEngagement: [],
//         };
//       }

//       let count = 0;
//       const perPostEngagement = [];

//       for (const post of posts) {
//         const engagement = post.likes + post.comments;
//         const postEngagementRate = (engagement / followerCount) * 100;
//         console.log(`Post ID: ${post.post_id}, PostType: ${post.post_type}, Likes: ${post.likes}, Comments: ${post.comments}, Engagement: ${engagement}, PostEngagementRate: ${postEngagementRate.toFixed(2)}%`);

//         perPostEngagement.push({
//           postId: post.post_id,
//           postUrl: post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : '',
//           publishTime: post.timestamp,
//           postType: post.post_type,
//           engagementRate: postEngagementRate.toFixed(2) + '%',
//           engagementToFollowerRatio: (engagement / followerCount).toFixed(4),
//           likes: post.likes,
//           comments: post.comments,
//         });

//         count++;
//         console.log('Processed post engagement:', perPostEngagement[perPostEngagement.length - 1]);
//       }

//       const avgEngagement = count > 0 ? total_engagement / count : 0;
//       const engagementToFollowerRatio = avgEngagement / followerCount;
//       const engagementRate = engagementToFollowerRatio * 100;
//       console.log('Engagement stats calculated: avgEngagement:', avgEngagement, 'engagementToFollowerRatio:', engagementToFollowerRatio, 'engagementRate:', engagementRate);

//       let message = '';
//       if (engagementRate >= 1.6) {
//         message = 'High engagement—your content resonates.';
//       } else if (engagementRate >= 1.1) {
//         message = 'Better than most in your industry.';
//       } else if (engagementRate >= 0.6) {
//         message = 'Standard engagement—room to grow.';
//       } else if (engagementRate >= 0.0) {
//         message = 'Minimal engagement for your audience size.';
//       }
//       console.log('Engagement message:', message);

//       return {
//         engagementRate: engagementRate.toFixed(2) + '%',
//         engagementToFollowerRatio: engagementToFollowerRatio.toFixed(4),
//         message,
//         perPostEngagement,
//       };
//     };

//     const followerCount = Number(profile.followers_count) || 0;
//     console.log('Follower count:', followerCount);
//     const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } = calculateEngagementStats(posts, followerCount);
//     console.log('Final engagement stats:', { engagementRate, engagementToFollowerRatio, message, perPostEngagement });

//     console.log('Returning final result');
//     return {
//       profile,
//       engagementRate,
//       message,
//       engagementToFollowerRatio,
//       perPostEngagement,
//       posts,
//     };
//   } catch (error: any) {
//     console.log('Error in main try block:', error.message, 'Stack:', error.stack);
//     logging.error(`Failed to fetch data: ${error.message}`);
//     return { error: `Failed to fetch data: ${error.message}` };
//   }
// };




export const getInstagramPostsFromScrapedData = async (
  handle: string,
  max_posts: number = 3,
  retry_attempts: number = 0,
  delay: number = 2
) => {
  // Validate environment variables
  console.log('Starting getInstagramPostsFromScrapedData with handle:', handle, 'max_posts:', max_posts);
  if (!API_KEY) {
    console.log('API_KEY is missing');
    return { error: 'SCRAPPER_CREATOR_APIKEY environment variable is not set' };
  }

  console.log('Extracting Instagram username from handle:', handle);
  handle = extractInstagramUsername(handle);
  console.log('Extracted handle:', handle);

  const headers = { 'x-api-key': API_KEY };
  console.log('Headers set:', headers);

  const get_instagram_profile = async (handle: string) => {
    const url = `${INSTAGRAM_PROFILE_URL}?handle=${handle}`;
    console.log('Fetching profile from URL:', url);

    try {
      console.log('Sending profile request with headers:', headers);
      const response = await axios.get(url, { headers });
      console.log('Profile response received:', JSON.stringify(response.data, null, 2));
      const profile_info = response.data?.data?.user || {};
      console.log('Profile info extracted:', profile_info);

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
      console.log('Error fetching profile:', error.message, 'Stack:', error.stack);
      logging.error(`Failed to fetch profile: ${error.message}`);
      return { error: `Failed to fetch profile: ${error.message}` };
    }
  };

  const format_timestamp = (unix_timestamp: number) => {
    console.log('Formatting timestamp:', unix_timestamp);
    try {
      const date = new Date(unix_timestamp * 1000); // Convert seconds to milliseconds
      const zonedDate = toZonedTime(date, 'UTC');
      const formatted = format(zonedDate, 'dd-MM-yyyy HH:mm:ss');
      console.log('Formatted timestamp:', formatted);
      return formatted;
    } catch (error: any) {
      console.log('Error formatting timestamp:', error.message);
      logging.error(`Error formatting timestamp: ${error.message}`);
      return null;
    }
  };

  try {
    console.log('Fetching Instagram profile for handle:', handle);
    const profile = await get_instagram_profile(handle);
    console.log('Profile fetched:', profile);
    if ('error' in profile) {
      console.log('Profile fetch failed with error:', profile.error);
      return { error: profile.error };
    }

    let total_posts = 0;
    let total_engagement = 0;
    let posts: any[] = [];
    let cursor: string | null = null;
    let attempt = 0;
    let previous_cursor: string | null = null;
    let empty_post_retries = 3;
    console.log('Initialized variables: total_posts:', total_posts, 'total_engagement:', total_engagement, 'posts:', posts, 'cursor:', cursor, 'empty_post_retries:', empty_post_retries);

    let last_response_data = null; // Store the last API response for posts

    while (total_posts < max_posts && empty_post_retries > 0) {
      const url: any = cursor
        ? `${INSTAGRAM_POST_URL}?handle=${handle}&cursor=${cursor}`
        : `${INSTAGRAM_POST_URL}?handle=${handle}`;
      console.log('Fetching posts from URL:', url);

      try {
        console.log(`Fetching posts... Current total: ${total_posts}, Cursor: ${cursor}, Attempt: ${attempt + 1}`);
        const response = await axios.get(url, { headers });
        console.log('Posts response received:', JSON.stringify(response.data, null, 2));
        const response_data = response.data;
        last_response_data = response_data; // Store the response data

        // Extract posts from response.data.items
        const fetched_posts = response_data.items || [];
        console.log('Fetched posts:', fetched_posts);

        if (!fetched_posts.length) {
          empty_post_retries--;
          console.log(`No posts found. Retrying... ${empty_post_retries} attempts remaining.`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          continue;
        } else {
          console.log('Posts found, resetting empty_post_retries to 3');
          empty_post_retries = 3;
        }

        for (const post of fetched_posts) {
          if (total_posts >= max_posts) {
            console.log('Max posts limit reached:', max_posts);
            break;
          }

          console.log('Processing post:', post);
          const post_id = post.id || post.pk;
          const likes = post.like_count || 0;
          const comments_disabled = post.commenting_disabled || true;
          const comments = comments_disabled ? 0 : post.comment_count || 0;
          const shares = post.share_count || 0; // Extract share count

          const post_data = {
            post_id,
            shortcode: post.code || '',
            is_video: post.media_type === 2 || false,
            post_type: post.media_type === 2 ? 'video' : 'image',
            likes,
            comments,
            shares, // Include shares in post_data
            caption: post.caption?.text || '',
            timestamp: post.taken_at ? format_timestamp(post.taken_at) : null,
            display_url: post.display_uri || '',
          };
          console.log('Post data created:', post_data);

          posts.push(post_data);
          total_engagement += likes + comments + shares; // Include shares in total engagement
          total_posts++;
          console.log('Post added. Updated totals: total_posts:', total_posts, 'total_engagement:', total_engagement);
        }

        previous_cursor = cursor;
        cursor = response_data.profile_grid_items_cursor || null;
        console.log(`Previous cursor: ${previous_cursor}, Next cursor: ${cursor}`);

        if (!cursor || cursor === previous_cursor) {
          console.log('No further pagination possible or cursor did not change.');
          break;
        }

        attempt = 0;
        console.log('Resetting attempt counter to 0');
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } catch (error: any) {
        console.log('Error fetching posts:', error.message, 'Stack:', error.stack);
        if (attempt < retry_attempts) {
          attempt++;
          const retry_delay = delay * attempt;
          console.log(`Retrying in ${retry_delay} seconds... (Attempt ${attempt}/${retry_attempts})`);
          await new Promise(resolve => setTimeout(resolve, retry_delay * 1000));
          continue;
        } else {
          console.log('Max retry attempts reached:', retry_attempts);
          logging.error(`Max retry attempts reached. Error fetching posts: ${error.message}`);
          return {
            profile,
            error: `Max retry attempts reached. Error fetching posts: ${error.message}`,
            post_api_response: last_response_data || null,
            posts: posts.length ? posts : null,
          };
        }
      }
    }

    const calculateEngagementStats = (posts: any[], followerCount: number) => {
      console.log('Calculating engagement stats for posts:', posts, 'followerCount:', followerCount);
      if (!followerCount || followerCount === 0) {
        console.log('No followers, returning default stats');
        return {
          engagementRate: '0.00%',
          engagementToFollowerRatio: '0.0000',
          perPostEngagement: [],
        };
      }

      let count = 0;
      const perPostEngagement = [];

      for (const post of posts) {
        const engagement = post.likes + post.comments + post.shares; // Include shares in engagement
        const postEngagementRate = (engagement / followerCount) * 100;
        console.log(`Post ID: ${post.post_id}, PostType: ${post.post_type}, Likes: ${post.likes}, Comments: ${post.comments}, Shares: ${post.shares}, Engagement: ${engagement}, PostEngagementRate: ${postEngagementRate.toFixed(2)}%`);

        perPostEngagement.push({
          postId: post.post_id,
          postUrl: post.shortcode ? `https://www.instagram.com/p/${post.shortcode}/` : '',
          publishTime: post.timestamp,
          postType: post.post_type,
          engagementRate: postEngagementRate.toFixed(2) + '%',
          engagementToFollowerRatio: (engagement / followerCount).toFixed(4),
          likes: post.likes,
          comments: post.comments,
          shares: post.shares, // Include shares in perPostEngagement
        });

        count++;
        console.log('Processed post engagement:', perPostEngagement[perPostEngagement.length - 1]);
      }

      const avgEngagement = count > 0 ? total_engagement / count : 0;
      const engagementToFollowerRatio = avgEngagement / followerCount;
      const engagementRate = engagementToFollowerRatio * 100;
      console.log('Engagement stats calculated: avgEngagement:', avgEngagement, 'engagementToFollowerRatio:', engagementToFollowerRatio, 'engagementRate:', engagementRate);

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
      console.log('Engagement message:', message);

      return {
        engagementRate: engagementRate.toFixed(2) + '%',
        engagementToFollowerRatio: engagementToFollowerRatio.toFixed(4),
        message,
        perPostEngagement,
      };
    };

    const followerCount = Number(profile.followers_count) || 0;
    console.log('Follower count:', followerCount);
    const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } = calculateEngagementStats(posts, followerCount);
    console.log('Final engagement stats:', { engagementRate, engagementToFollowerRatio, message, perPostEngagement });

    console.log('Returning final result');

    const instagram_data = {
      profile,
      engagementRate,
      message,
      engagementToFollowerRatio,
      perPostEngagement
    };
    return {
      instagram_data 
    
    };
  } catch (error: any) {
    console.log('Error in main try block:', error.message, 'Stack:', error.stack);
    logging.error(`Failed to fetch data: ${error.message}`);
    return { error: `Failed to fetch data: ${error.message}` };
  }
};



