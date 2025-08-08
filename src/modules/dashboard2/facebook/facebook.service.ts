
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const FACEBOOK_PROFILE_URL = process.env.FACEBOOK_PROFILE_ULR;
const FACEBOOK_POST_URL = process.env.FACEBOOK_POST_URL;

const headers = { 'x-api-key': API_KEY };


// export const getFacebookPostsFromScrapedData = async (facebook_handle: string) => {
//   const handle = facebook_handle.trim();
//   const isPageId = /^\d+$/.test(handle);

//   const queryParam = isPageId
//     ? `pageId=${handle}`
//     : `url=https://${handle.replace(/^https?:\/\//, '')}`;

//   const url = `${FACEBOOK_POST_URL}?${queryParam}`;
//   const profile = await getFacebookProfileFromScrapedData(facebook_handle);

//   try {
//     console.log("calling facebook post endpoint")
//     const response = await axios.get(url, { headers });
//     console.log("response fetch")
//     const posts = response.data?.posts || [];
//     console.log("extracting post data")

//     // Small delay for rate limit handling
//     await new Promise(resolve => setTimeout(resolve, 1500));

//     const calculateEngagementStats = (posts: any[], followerCount: number) => {
//       if (!followerCount || followerCount === 0) {
//         return {
//           engagementRate: '0.00%',
//           engagementToFollowerRatio: '0.0000',
//           perPostEngagement: [],
//         };
//       }

//       let totalEngagement = 0;
//       let count = 0;
//       const perPostEngagement = [];

//       for (const post of posts) {
//         const reactions = Number(post.reactionCount || 0);
//         const comments = Number(post.commentCount || 0);
//         const engagement = reactions + comments;

//         totalEngagement += engagement;
//         count++;

//         // Determine post type (video, image, text, etc.)
//         let postType = 'text'; // Default to text
//         if (post.videoDetails && Object.keys(post.videoDetails).length > 0) {
//           postType = 'video';
//         } else if (post.url && post.url.includes('/videos/')) {
//           postType = 'video';
//         } else if (post.thumbnailUrl || (post.attachments && post.attachments.some((a: any) => a.type === 'photo'))) {
//           postType = 'image'; // Adjust based on actual data structure
//         }

//         // Debugging: Log post details to verify detection
//         console.log(`Post ID: ${post.id}, PostType: ${postType}, VideoDetails: ${JSON.stringify(post.videoDetails)}, URL: ${post.url}`);

//         // Calculate engagement for all posts
//         const postEngagementRate = (engagement / followerCount) * 100;
//         perPostEngagement.push({
//           postId: post.id,
//           postUrl: post.url,
//           publishTime: post.publishTime || null,
//           postType, // Include post type (video, image, text, etc.)
//           engagementRate: postEngagementRate.toFixed(2) + '%',
//           engagementToFollowerRatio: (engagement / followerCount).toFixed(4),
//           reactions,
//           comments,
//         });
//       }

//       if (count === 0) {
//         return {
//           engagementRate: '0.00%',
//           engagementToFollowerRatio: '0.0000',
//           perPostEngagement: [],
//         };
//       }

//       const avgEngagement = totalEngagement / count;
//       const engagementToFollowerRatio = avgEngagement / followerCount;
//       const engagementRate = engagementToFollowerRatio * 100;

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

//       return {
//         engagementRate: engagementRate.toFixed(2) + '%',
//         engagementToFollowerRatio: engagementToFollowerRatio.toFixed(4),
//         message,
//         perPostEngagement,
//       };
//     };

//     const followerCount = Number(profile?.followerCount) || 0;
//     const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } = calculateEngagementStats(posts, followerCount);


//      const facebook_data = {
//       message,

//       facebook_handle,
//       profile,
//       engagementRate,
//       engagementToFollowerRatio,
//       perPostEngagement
//     };
//     return {
//       facebook_data 
//     };
//   } catch (error: any) {
//     return { error: `Failed to fetch posts: ${error.message}` };
//   }
// };


function detectFacebookPostType(post: any): 'video' | 'image' | 'text' {
  if (post.videoDetails && Object.keys(post.videoDetails).length > 0) {
    return 'video';
  } else if (post.url?.includes('/videos/')) {
    return 'video';
  } else if (post.thumbnailUrl || (post.attachments?.some((a: any) => a.type === 'photo'))) {
    return 'image';
  }
  return 'text';
}

function calculateEngagementStats(posts: any[], followerCount: number) {
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
    const engagement = (post.reactions || post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    const postEngagementRate = (engagement / followerCount) * 100;

    perPostEngagement.push({
      postId: post.postId || post.id,
      postUrl: post.postUrl || '',
      publishTime: post.publishTime || post.timestamp || null,
      postType: post.postType || 'text',
      engagementRate: postEngagementRate.toFixed(2) + '%',
      engagementToFollowerRatio: (engagement / followerCount).toFixed(2),
      reactions: post.reactions || post.likes || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
    });

    count++;
  }

  const avgEngagement = count > 0 ? perPostEngagement.reduce((sum, p) => sum + parseFloat(p.engagementToFollowerRatio), 0) / count : 0;
  const engagementToFollowerRatio = avgEngagement;
  const engagementRate = engagementToFollowerRatio * 100;
let message = ""
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

if (engagementRate >= 90) {
  message = 'Phenomenal engagement — your audience is deeply invested. Maintain momentum and consider scaling efforts.';
} else if (engagementRate >= 70) {
  message = 'Outstanding engagement — strong resonance with your audience. You’re in the top tier.';
} else if (engagementRate >= 60) {
  message = 'Very strong engagement — content is performing exceptionally well. Keep refining your approach.';
} else if (engagementRate >= 50) {
  message = 'Strong engagement — above typical benchmarks. Continue doubling down on high-performing themes.';
} else if (engagementRate >= 30) {
  message = 'Good engagement — your content is working. Try to identify patterns and push further.';
} else if (engagementRate >= 20) {
  message = 'Moderate engagement — youre connecting with a segment of your audience. Opportunity exists for growth.';
} else if (engagementRate >= 10) {
  message = 'Mediocre engagement — some traction, but performance is inconsistent. Consider optimizing timing, format, or topics.';
} else if (engagementRate >= 5) {
  message = 'Low engagement — most content isn’t resonating. Rethink your strategy and test new angles.';
} else if (engagementRate >= 1) {
  message = 'Very low engagement — your content isn’t reaching or connecting with your audience. Audit both reach and relevance.';
} else {
  message = 'No engagement — your content is completely missing the mark. Urgent changes are needed in approach and execution.';
}

function getRandomGeneralEngagementMessage(rate: number): string {
  if (rate >= 90) {
    return getRandomMessage([
      "💥 Phenomenal engagement — your audience is fully invested in your content.",
      "🌐 You're setting the standard — this level of loyalty signals brand leadership.",
      "🚀 Peak performance — now is the time to scale ads, collaborations, or premium content."
    ]);
  } else if (rate >= 70) {
    return getRandomMessage([
      "🔥 Outstanding engagement — you're connecting with depth and consistency.",
      "🏆 Elite-level response — few achieve this. Consider capturing insights from top posts.",
      "📣 You're in the spotlight — maintain variety while reinforcing your core strengths."
    ]);
  } else if (rate >= 60) {
    return getRandomMessage([
      "🎯 Very strong engagement — your creative strategy is clearly working.",
      "📊 Strong signals — use this traction to test high-value campaigns or audience segments.",
      "📈 High response rate — consider launching a series or deeper community content."
    ]);
  } else if (rate >= 50) {
    return getRandomMessage([
      "✅ Strong engagement — you're outperforming industry norms.",
      "🚧 Above-benchmark performance — keep your current rhythm but test small pivots.",
      "💡 You're in a growth zone — now is the time to fine-tune frequency and style."
    ]);
  } else if (rate >= 30) {
    return getRandomMessage([
      "📌 Good engagement — your message is landing with a significant portion of your audience.",
      "🔍 Consistent visibility — analyze which formats drive this and amplify them.",
      "🧭 You're on the map — double down on your unique tone or value proposition."
    ]);
  } else if (rate >= 20) {
    return getRandomMessage([
      "📉 Moderate engagement — content has potential but lacks punch.",
      "📤 Partial connection — refine storytelling and lean into community cues.",
      "🛠️ You're warming up — think iterative testing of visuals and message framing."
    ]);
  } else if (rate >= 10) {
    return getRandomMessage([
      "⚠️ Mediocre engagement — occasional wins, but overall impact is muted.",
      "🧪 Some traction, but inconsistent — tighten your theme and A/B test frequently.",
      "📆 Review post timing and content hooks — you’re not far from stronger results."
    ]);
  } else if (rate >= 5) {
    return getRandomMessage([
      "🔧 Low engagement — your content isn’t sticking. Explore underserved content gaps.",
      "🕵️‍♂️ You're missing emotional or practical appeal — audit tone and intent.",
      "📉 Weak response — are you solving a clear problem or sparking curiosity?"
    ]);
  } else if (rate >= 1) {
    return getRandomMessage([
      "❓ Very low engagement — your content is being ignored or scrolled past.",
      "🪞 Take a hard look — is your content visually compelling and audience-relevant?",
      "⏳ Your audience isn't connecting — rethink the story or experience you're offering."
    ]);
  } else {
    return getRandomMessage([
      "⛔ No engagement — this content strategy isn't working at all.",
      "💀 You're invisible — shift focus, tone, and value proposition immediately.",
      "📵 No traction — reboot with audience research, new formats, or even a brand refresh."
    ]);
  }
}



  return {
    engagementRate: engagementRate.toFixed(2) + '%',
    engagementToFollowerRatio: engagementToFollowerRatio.toFixed(2),
    message:getRandomGeneralEngagementMessage(engagementRate),
    perPostEngagement,
  };
}


export const getFacebookPostsFromScrapedData = async (
  facebook_handle: string,
  max_posts: number = 3,
  retry_attempts: number = 2,
  delay: number = 2
) => {
  const headers = { 'x-api-key': API_KEY };
  const handle = facebook_handle.trim();
  const isPageId = /^\d+$/.test(handle);
  const queryParam = isPageId
    ? `pageId=${handle}`
    : `url=https://${handle.replace(/^https?:\/\//, '')}`;

  const profile = await getFacebookProfileFromScrapedData(facebook_handle);
  const followerCount = Number(profile?.followerCount || 0);

  let total_posts = 0;
  let total_engagement = 0;
  let posts: any[] = [];
  let cursor: string | null = null;
  let attempt = 0;
  let previous_cursor: string | null = null;
  let empty_post_retries = 3;

  try {
    while (total_posts < max_posts && empty_post_retries > 0) {
      const url : any= cursor
        ? `${FACEBOOK_POST_URL}?${queryParam}&cursor=${cursor}`
        : `${FACEBOOK_POST_URL}?${queryParam}`;

      try {
        const response = await axios.get(url, { headers });
        const data = response.data || {};
        const fetched_posts = data.posts || [];

        if (!fetched_posts.length) {
          empty_post_retries--;
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          continue;
        } else {
          empty_post_retries = 0;
        }

        for (const post of fetched_posts) {
          if (total_posts >= max_posts) break;

          const reactions = Number(post.reactionCount || 0);
          const comments = Number(post.commentCount || 0);
          const engagement = reactions + comments;

          const postType = detectFacebookPostType(post);
          const postEngagementRate = (engagement / (followerCount || 1)) * 100;

          posts.push({
            postId: post.id,
            postUrl: post.url,
            publishTime: post.publishTime || null,
            postType,
            engagementRate: postEngagementRate.toFixed(2) + '%',
            engagementToFollowerRatio: (engagement / (followerCount || 1)).toFixed(2),
            reactions,
            comments,
          });

          total_engagement += engagement;
          total_posts++;
        }

        previous_cursor = cursor;
        cursor = data?.next_cursor || null;

        if (!cursor || cursor === previous_cursor) {
          break;
        }

        attempt = 0;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } catch (error: any) {
        if (attempt < retry_attempts) {
          attempt++;
          const retryDelay = delay * attempt;
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
          continue;
        } else {
          return {
            profile,
            error: `Max retry attempts reached. Error fetching posts: ${error.message}`,
            posts: posts.length ? posts : null,
          };
        }
      }
    }

    const { engagementRate, engagementToFollowerRatio, message, perPostEngagement } =
      calculateEngagementStats(posts, followerCount);

    return {
      facebook_data: {
        facebook_handle,
        profile,
        engagementRate,
        engagementToFollowerRatio,
        message,
        perPostEngagement,
      },
    };
  } catch (error: any) {
    return { error: `Failed to fetch Facebook data: ${error.message}` };
  }
};


export const getFacebookProfileFromScrapedData = async (facebook_handle: string) => {
  const cleanUrl = facebook_handle.trim().replace(/^https?:\/\//, '');
  const url = `${FACEBOOK_PROFILE_URL}?url=https://${cleanUrl}`;

  try {
    console.log("calling facebook profile endpoint")
    const response = await axios.get(url, { headers });
    console.log("profile fetch",response)
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
