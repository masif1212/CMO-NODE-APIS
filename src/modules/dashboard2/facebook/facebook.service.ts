
import axios from 'axios';

const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const FACEBOOK_PROFILE_URL = 'https://api.scrapecreators.com/v1/facebook/profile';
const FACEBOOK_POST_URL  = 'https://api.scrapecreators.com/v1/facebook/profile/posts'

const headers = { 'x-api-key': API_KEY };



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
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}



function calculateEngagementStats(posts: any[], followerCount: number) {
  if (!followerCount || followerCount === 0) {
    return {
      engagementRate: '0.0000%',
      engagementToFollowerRatio: '0.0000',
      perPostEngagement: [],
    };
  }

  const perPostEngagement = posts.map(post => {
    const engagement =
      (post.reactions || post.likes || 0) +
      (post.comments || 0) +
      (post.shares || 0);

    const ratio = engagement / followerCount;
    const rate = ratio * 100;

    return {
      postId: post.postId || post.id,
      postUrl: post.postUrl || '',
      publishTime: post.publishTime || post.timestamp || null,
      postType: post.postType || 'text',
      engagementRate: rate.toFixed(4) + '%', // 4 decimals for small values
      engagementToFollowerRatio: ratio.toFixed(6), // keep extra precision
      reactions: post.reactions || post.likes || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
    };
  });

  // Calculate average engagement
  const avgRatio =
    perPostEngagement.reduce((sum, p) => sum + parseFloat(p.engagementToFollowerRatio), 0) /
    perPostEngagement.length;

  const engagementRate = avgRatio * 100;

  return {
    engagementRate: engagementRate.toFixed(4) + '%',
    engagementToFollowerRatio: avgRatio.toFixed(6),
    message: getRandomGeneralEngagementMessage(engagementRate),
    perPostEngagement,
  };
}



export const getFacebookPostsFromScrapedData = async (
  facebook_handle: string,
  max_posts: number = 3,
  retry_attempts: number = 4,
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
  let empty_post_retries = 4;

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
          const shares = Number(post.shareCount || 0); 

            const engagement = reactions + comments + shares;


          const postType = detectFacebookPostType(post);
          const postEngagementRate = (engagement / (followerCount || 1)) * 100;

          posts.push({
            postId: post.id,
            postUrl: post.url,
            publishTime: post.publishTime || null,
            postType,
            engagementRate: postEngagementRate.toFixed(4) + '%',
            engagementToFollowerRatio: (engagement / (followerCount || 1)).toFixed(4),
            reactions,
            comments,
            shares
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
    // console.log("profile fetch",response)
    return extractFacebookProfileInfo(response.data);
  } catch (error: any) {
    return { error: `Failed to fetch profile: ${error.message}` };
  }
};


const extractFacebookProfileInfo = (data: any) => {
  // console.log("data",data)
  try {
    const profileInfo: Record<string, any> = {
      name: data.name || 'N/A',
      profileUrl: data.url || 'N/A',
      likeCount: data.likeCount || 'N/A',
      followerCount: data.followerCount || 'N/A',
      rating: data.rating || 'N/A',
      isBusinessPageActive:data.isBusinessPageActive,
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
