// import axios from 'axios';
// import qs from 'querystring';

// const FB_BASE = 'https://graph.facebook.com/v19.0';

// export class FacebookService {
//   static getAuthUrl(): string {
//     const params = qs.stringify({
//       client_id: process.env.FACEBOOK_APP_ID,
//       redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
//       scope: 'email,public_profile,pages_show_list,pages_read_engagement,instagram_basic',
//       response_type: 'code',
//     });
//     return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
//   }

//   static async getAccessToken(code: string) {
//     const params = {
//       client_id: process.env.FACEBOOK_APP_ID!,
//       client_secret: process.env.FACEBOOK_APP_SECRET!,
//       redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
//       code,
//     };
//     const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
//     return res.data; // { access_token, token_type, expires_in }
//   }

//   static async getProfile(access_token: string) {
//     console.log("🔹 Getting profile...");
//     const res = await axios.get(`${FB_BASE}/me`, {
//       params: {
//         fields: 'id,name,email,picture',
//         access_token,
//       },
//     });
//     return res.data;
//   }

//   static async getPages(access_token: string) {
//     console.log("🔹 Getting pages...");
//     const res = await axios.get(`${FB_BASE}/me/accounts`, {
//       params: { access_token },
//     });

//     const pages = res.data?.data ?? [];

//     const enrichedPages = await Promise.all(
//       pages.map(async (page: any) => {
//         const pageId = page.id;
//         const pageToken = page.access_token;

//         try {
//           // 🔸 Follower count
//           const followersRes = await axios.get(`${FB_BASE}/${pageId}/insights`, {
//             params: {
//               metric: 'page_fans',
//               period: 'day',
//               access_token: pageToken,
//             },
//           });

//           const followers = followersRes?.data?.data?.[0]?.values?.[0]?.value ?? null;

//           // 🔸 Posts in last 30 days
//           const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
//           const postsRes = await axios.get(`${FB_BASE}/${pageId}/posts`, {
//             params: {
//               since,
//               limit: 100,
//               access_token: pageToken,
//             },
//           });

//           const postCount = postsRes?.data?.data?.length ?? 0;

//           return {
//             ...page,
//             followers,
//             postCount,
//           };
//         } catch (err: any) {
//           console.warn(`⚠️ Analytics fetch failed for page ${page.name}`, err.message);
//           return {
//             ...page,
//             followers: null,
//             postCount: null,
//             error: true,
//           };
//         }
//       })
//     );

//     return { data: enrichedPages };
//   }
//   static async getPageFollowers(pageId: string, token: string) {
//   const res = await axios.get(`${FB_BASE}/${pageId}?fields=fan_count`, {
//     params: { access_token: token },
//   });
//   console.log("res",res)
//   return res.data.fan_count;
// }

// static async getPagePostCount(pageId: string, token: string) {
//   const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
//     params: { access_token: token, limit: 100 },
//   });
//   return res.data.data?.length || 0;
// }

// static async getInstagramInfo(pageId: string, token: string) {
//   const res = await axios.get(`${FB_BASE}/${pageId}?fields=connected_instagram_account`, {
//     params: { access_token: token },
//   });
//   return res.data.connected_instagram_account || null;
// }



// static async getPageBio(pageId: string, token: string) {
//   const url = `${FB_BASE}/${pageId}?fields=about,description`;
//   const res = await axios.get(url, {
//     params: { access_token: token }
//   });

//   return {
//     about: res.data.about || null,
//     description: res.data.description || null
//   };
// }


//   static async getInstagramBusinessAccount(pageId: string, pageToken: string) {
//     const res = await axios.get(`${FB_BASE}/${pageId}`, {
//       params: {
//         fields: 'instagram_business_account',
//         access_token: pageToken,
//       },
//     });
//     return res.data;
//   }
// }












import axios from 'axios';
import qs from 'querystring';

const FB_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookService {
  static getAuthUrl(): string {
    const params = qs.stringify({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      // scope: 'email,public_profile,pages_show_list,pages_read_engagement,instagram_basic',
      scope: 'email,public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,read_insights,instagram_basic',

      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  static async getAccessToken(code: string) {
    const params = {
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
      code,
    };
    const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
    return res.data;
  }

  static async getProfile(access_token: string) {
    const res = await axios.get(`${FB_BASE}/me`, {
      params: {
        fields: 'id,name,email,picture',
        access_token,
      },
    });
    return res.data;
  }

  static async getPages(access_token: string) {
    const res = await axios.get(`${FB_BASE}/me/accounts`, {
      params: { access_token },
    });
    const pages = res.data?.data ?? [];
    const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    const enrichedPages = await Promise.all(
      pages.map(async (page: any) => {
        const pageId = page.id;
        const pageToken = page.access_token;

        try {
          const [followersRes, postsRes, insightsRes, bioRes, igRes] = await Promise.all([
            axios.get(`${FB_BASE}/${pageId}?fields=fan_count`, {
              params: { access_token: pageToken },
            }),
            axios.get(`${FB_BASE}/${pageId}/posts`, {
              params: { since, limit: 100, access_token: pageToken },
            }),
            axios.get(`${FB_BASE}/${pageId}/insights/page_engaged_users`, {
              params: { since, access_token: pageToken },
            }),
            axios.get(`${FB_BASE}/${pageId}?fields=about,description`, {
              params: { access_token: pageToken },
            }),
            axios.get(`${FB_BASE}/${pageId}?fields=instagram_business_account`, {
              params: { access_token: pageToken },
            }),
          ]);

          const followers = followersRes.data?.fan_count ?? null;
          const postCount = postsRes.data?.data?.length ?? 0;
          const engagement = insightsRes.data?.data?.[0]?.values ?? [];

          const dailyMetrics: Record<string, any> = {};
          engagement.forEach((entry: any) => {
            const date = entry.end_time.split('T')[0];
            dailyMetrics[date] = {
              engagementRate: entry.value,
              postCount: postCount / 30, // naive distribution
            };
          });

          const bio = {
            about: bioRes.data.about || null,
            description: bioRes.data.description || null,
          };

          const igAccountId = igRes.data?.instagram_business_account?.id;
          let instagramData = null;

          if (igAccountId) {
            const [igFollowersRes, igMediaRes] = await Promise.all([
              axios.get(`${FB_BASE}/${igAccountId}?fields=followers_count`, {
                params: { access_token: pageToken },
              }),
              axios.get(`${FB_BASE}/${igAccountId}/media`, {
                params: { fields: 'like_count,comments_count,timestamp', access_token: pageToken },
              }),
            ]);

            const media = igMediaRes.data?.data || [];
            const igMetrics: Record<string, any> = {};
            let igEngagementTotal = 0;
            let igPostCount = 0;

            media.forEach((post: any) => {
              const date = post.timestamp.split('T')[0];
              if (!igMetrics[date]) igMetrics[date] = { likes: 0, comments: 0, postCount: 0 };
              igMetrics[date].likes += post.like_count;
              igMetrics[date].comments += post.comments_count;
              igMetrics[date].postCount++;
              igEngagementTotal += post.like_count + post.comments_count;
              igPostCount++;
            });

            const igFollowerCount = igFollowersRes.data?.followers_count || 0;
            const igEngagementRate = igPostCount > 0 && igFollowerCount > 0
              ? (igEngagementTotal / igPostCount) / igFollowerCount * 100
              : 0;

            instagramData = {
              followers: igFollowerCount,
              engagementToFollowerRatio: igEngagementRate,
              dailyMetrics: igMetrics,
            };
          }

          return {
            facebookData: {
              ...page,
              followers,
              postCount,
              engagementToFollowerRatio: followers ? (Object.values(dailyMetrics).reduce((acc: number, val: any) => acc + val.engagementRate, 0) / 30) / followers * 100 : 0,
              bio,
              dailyMetrics,
            },
            instagramData,
          };
        } catch (err: any) {
          console.warn(`⚠️ Analytics fetch failed for page ${page.name}`, err.message);
          return {
            facebookData: { ...page, error: true },
            instagramData: null,
          };
        }
      })
    );

    return { data: enrichedPages };
  }
}




