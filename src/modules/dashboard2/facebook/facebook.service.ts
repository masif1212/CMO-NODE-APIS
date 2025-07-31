
// import axios from 'axios';
// import qs from 'querystring';

// const FB_BASE = 'https://graph.facebook.com/v19.0';

// export class FacebookService {
//   private static thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

 

//   static getAuthUrl(state?: string): string {
//   const params = qs.stringify({
//     client_id: process.env.FACEBOOK_APP_ID,
//     redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
//     scope: 'email,public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,instagram_basic,instagram_manage_insights',
//     response_type: 'code',
//     prompt: 'select_account',
//     ...(state ? { state } : {}) // ✅ now `state` is always defined
//   });

//   return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
// }
//    static async getAppAccessToken(): Promise<string> {
//     try {
//       const params = {
//         client_id: process.env.FACEBOOK_APP_ID!,
//         client_secret: process.env.FACEBOOK_APP_SECRET!,
//         grant_type: 'client_credentials',
//       };
//       const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
//       return res.data.access_token;
//     } catch (err: any) {
//       console.error('Error fetching app access token:', err.response?.data || err.message);
//       throw new Error('Failed to fetch app access token');
//     }
//   }

//   // Fetch basic public page info by page URL or ID
//   static async getPublicPageInfo(pageUrlOrId: string): Promise<any> {
//     try {
//       // Extract page ID from URL or use directly if ID is provided
//       let pageId = pageUrlOrId;
//       if (pageUrlOrId.includes('facebook.com')) {
//         const match = pageUrlOrId.match(/facebook\.com\/([^\/?]+)/);
//         if (match && match[1]) {
//           pageId = match[1];
//         } else {
//           throw new Error('Invalid Facebook page URL');
//         }
//       }

//       // Get App Access Token
//       const accessToken = await this.getAppAccessToken();

//       // Fetch basic public page data
//       const res = await axios.get(`${FB_BASE}/${pageId}`, {
//         params: {
//           fields: 'id,name,picture,category,about,description,website',
//           access_token: accessToken,
//         },
//       });

//       return res.data;
//     } catch (err: any) {
//       console.error('Error fetching public page info:', err.response?.data || err.message);
//       throw new Error(err.response?.data?.error?.message || 'Failed to fetch page info');
//     }
//   }


//   static async getAccessToken(code: string) {
//     try {
//       const params = {
//         client_id: process.env.FACEBOOK_APP_ID!,
//         client_secret: process.env.FACEBOOK_APP_SECRET!,
//         redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
//         code,
//       };
//       const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
//       return res.data;
//     } catch (err: any) {
//       console.error('Error fetching access token:', err.response?.data || err.message);
//       throw err;
//     }
//   }

//   static async getProfile(access_token: string) {
//     try {
//       const res = await axios.get(`${FB_BASE}/me`, {
//         params: {
//           fields: 'id,name,email,picture',
//           access_token,
//         },
//       });
//       return res.data;
//     } catch (err: any) {
//       console.error('Error fetching profile:', err.response?.data || err.message);
//       throw err;
//     }
//   }

//   static async getPages(access_token: string, selectedPageId?: string, selectedPageUrl?: string) {
//   try {
//     const res = await axios.get(`${FB_BASE}/me/accounts`, {
//       params: { access_token },
//     });

//     const pages = res.data?.data ?? [];

//     let matchedPage = null;

//     if (selectedPageId || selectedPageUrl) {
//       matchedPage = pages.find((page: any) => {
//         return (
//           (selectedPageId && page.id === selectedPageId) ||
//           (selectedPageUrl && page.link && page.link.includes(selectedPageUrl))
//         );
//       });

//       if (matchedPage) {
//         try {
//           const [followers, postCount] = await Promise.all([
//             this.getPageFollowers(matchedPage.id, matchedPage.access_token),
//             this.getPagePostCount(matchedPage.id, matchedPage.access_token),
//           ]);

//           return {
//             data: [
//               {
//                 ...matchedPage,
//                 followers,
//                 postCount,
//                 postingFrequency: postCount / 30,
//               },
//             ],
//           };
//         } catch (err: any) {
//           console.warn(`Failed to fetch analytics for page ${matchedPage.name}:`, err.response?.data || err.message);
//           return {
//             data: [
//               {
//                 ...matchedPage,
//                 followers: null,
//                 postCount: null,
//                 postingFrequency: null,
//                 error: true,
//               },
//             ],
//           };
//         }
//       }
//     }

//     // No match or no selectedPageId/url — return full list
//     return {
//       data: pages.map((page: any) => ({
//         ...page,
//         followers: null,
//         postCount: null,
//         postingFrequency: null,
//         needsSelection: true,
//       })),
//       message: 'No matching page found. Please select one.',
//     };
//   } catch (err: any) {
//     console.error('Error fetching pages:', err.response?.data || err.message);
//     throw err;
//   }
// }


//   static async getPageFollowers(pageId: string, token: string) {
//     try {
//       const res = await axios.get(`${FB_BASE}/${pageId}?fields=fan_count`, {
//         params: { access_token: token },
//       });
//       return res.data.fan_count || 0;
//     } catch (err: any) {
//       console.error(`Error fetching followers for page ${pageId}:`, err.response?.data || err.message);
//       return 0;
//     }
//   }

//   static async getPagePostCount(pageId: string, token: string) {
//     try {
//       const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
//         params: { access_token: token, since: this.thirtyDaysAgo, limit: 100 },
//       });
//       return res.data.data?.length || 0;
//     } catch (err: any) {
//       console.error(`Error fetching post count for page ${pageId}:`, err.response?.data || err.message);
//       return 0;
//     }
//   }



//   static async getPageMetrics(pageId: string, token: string) {
//   try {
//     const followers = await this.getPageFollowers(pageId, token);

//     const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
//       params: {
//         fields: 'likes.summary(true),comments.summary(true),created_time',
//         access_token: token,
//         since: this.thirtyDaysAgo,
//         limit: 100,
//       },
//     });

//     const posts = res.data.data || [];
//     let totalLikes = 0;
//     let totalComments = 0;
//     const dailyMetrics: { [date: string]: any } = {};

//     // Init last 30 days with zero values
//     const today = new Date();
//     for (let i = 0; i < 30; i++) {
//       const date = new Date(today);
//       date.setDate(today.getDate() - i);
//       const isoDate = date.toISOString().split('T')[0];
//       dailyMetrics[isoDate] = {
//         views: 0,
//         likes: 0,
//         comments: 0,
//         engagementRate: 0,
//         postCount: 0,
//       };
//     }

//     posts.forEach((post: any) => {
//       const likes = post.likes?.summary?.total_count || 0;
//       const comments = post.comments?.summary?.total_count || 0;
//       totalLikes += likes;
//       totalComments += comments;

//       const date = post.created_time.split('T')[0];
//       if (dailyMetrics[date]) {
//         dailyMetrics[date].likes += likes;
//         dailyMetrics[date].comments += comments;
//         dailyMetrics[date].postCount += 1;
//       }
//     });

//     // Fetch impressions (views)
//     try {
//       const insightsRes = await axios.get(`${FB_BASE}/${pageId}/insights`, {
//         params: {
//           metric: 'page_impressions',
//           period: 'day',
//           since: this.thirtyDaysAgo,
//           until: Math.floor(Date.now() / 1000),
//           access_token: token,
//         },
//       });

//       const impressionsData = insightsRes.data.data.find((d: any) => d.name === 'page_impressions');
//       if (impressionsData) {
//         impressionsData.values.forEach((val: any) => {
//           const date = val.end_time.split('T')[0];
//           if (dailyMetrics[date]) {
//             dailyMetrics[date].views = val.value;
//           }
//         });
//       }
//     } catch (e: any) {
//       console.warn(`Page impressions fetch failed:`, e.response?.data || e.message);
//     }

//     // Final engagementRate calculation
//     Object.entries(dailyMetrics).forEach(([date, metrics]) => {
//       const { likes, comments, views } = metrics;
//       const engagement = likes + comments;
//       metrics.engagementRate = views > 0 ? (engagement / views) * 100 : 0;
//     });

//     const totalEngagement = (totalLikes + totalComments)/followers*100;

//     return {
//       followers,
//       totalEngagement,
//       engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
//       postingFrequency: posts.length / 30,
//       dailyMetrics,
//     };
//   } catch (err: any) {
//     console.error(`Failed to fetch page metrics:`, err.response?.data || err.message);
//     const followers = await this.getPageFollowers(pageId, token);
//     const postCount = await this.getPagePostCount(pageId, token);
//     return {
//       followers,
//       totalEngagement: 0,
//       engagementToFollowerRatio: 0,
//       postingFrequency: postCount / 30,
//       dailyMetrics: {},
//       error: err.response?.data?.error?.message || err.message,
//     };
//   }
// }




//   static async getInstagramMetrics(pageId: string, pageToken: string) {
//   try {
//     const igAccount = await this.getInstagramBusinessAccount(pageId, pageToken);
//     if (!igAccount?.instagram_business_account?.id) return null;

//     const igId = igAccount.instagram_business_account.id;

//     const followersRes = await axios.get(`${FB_BASE}/${igId}`, {
//       params: { fields: 'followers_count', access_token: pageToken },
//     });
//     const followers = followersRes.data.followers_count || 0;

//     const mediaRes = await axios.get(`${FB_BASE}/${igId}/media`, {
//       params: {
//         fields: 'like_count,comments_count,timestamp',
//         access_token: pageToken,
//         limit: 30,
//         since: this.thirtyDaysAgo,
//       },
//     });

//     const posts = mediaRes.data.data || [];
//     let totalLikes = 0;
//     let totalComments = 0;
//     const dailyMetrics: { [date: string]: any } = {};

//     // Init last 30 days with zeros
//     const today = new Date();
//     for (let i = 0; i < 30; i++) {
//       const date = new Date(today);
//       date.setDate(today.getDate() - i);
//       const isoDate = date.toISOString().split('T')[0];
//       dailyMetrics[isoDate] = {
//         views: 0,
//         likes: 0,
//         comments: 0,
//         engagementRate: 0,
//         postCount: 0,
//       };
//     }

//     posts.forEach((post: any) => {
//       const likes = post.like_count || 0;
//       const comments = post.comments_count || 0;
//       totalLikes += likes;
//       totalComments += comments;

//       const date = post.timestamp.split('T')[0];
//       if (dailyMetrics[date]) {
//         dailyMetrics[date].likes += likes;
//         dailyMetrics[date].comments += comments;
//         dailyMetrics[date].postCount += 1;
//       }
//     });

//     // Try fetching impressions
//     try {
//       const insightsRes = await axios.get(`${FB_BASE}/${igId}/insights`, {
//         params: {
//           metric: 'impressions',
//           period: 'day',
//           since: this.thirtyDaysAgo,
//           until: Math.floor(Date.now() / 1000),
//           access_token: pageToken,
//         },
//       });

//       const impressionsData = insightsRes.data.data.find((d: any) => d.name === 'impressions');
//       if (impressionsData) {
//         impressionsData.values.forEach((val: any) => {
//           const date = val.end_time.split('T')[0];
//           if (dailyMetrics[date]) {
//             dailyMetrics[date].views = val.value;
//           }
//         });
//       }
//     } catch (e: any) {
//       console.warn(`Instagram impressions fetch failed:`, e.response?.data || e.message);
//     }

//     Object.entries(dailyMetrics).forEach(([date, metrics]) => {
//       const { likes, comments, views } = metrics;
//       const engagement = likes + comments;
//       metrics.engagementRate = views > 0 ? (engagement / views) * 100 : 0;
//     });

//     const totalEngagement = totalLikes + totalComments;

//     return {
//       followers,
//       totalEngagement,
//       engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
//       postingFrequency: posts.length / 30,
//       dailyMetrics,
//     };
//   } catch (err: any) {
//     console.error(`Failed to fetch Instagram metrics:`, err.response?.data || err.message);
//     return null;
//   }
// }


//   static async getInstagramBusinessAccount(pageId: string, pageToken: string) {
//     try {
//       const res = await axios.get(`${FB_BASE}/${pageId}`, {
//         params: {
//           fields: 'instagram_business_account',
//           access_token: pageToken,
//         },
//       });
//       return res.data;
//     } catch (err: any) {
//       console.error(`Error fetching Instagram business account for page ${pageId}:`, err.response?.data || err.message);
//       return null;
//     }
//   }
// }






import axios from 'axios';
import qs from 'querystring';

const FB_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookService {
  private static thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  static getAuthUrl(state?: string): string {
    const params = qs.stringify({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      scope: 'email,public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,instagram_basic,instagram_manage_insights',
      response_type: 'code',
      prompt: 'select_account',
      ...(state ? { state } : {}),
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  static async getAppAccessToken(): Promise<string> {
    try {
      const params = {
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        grant_type: 'client_credentials',
      };
      const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
      return res.data.access_token;
    } catch (err: any) {
      console.error('Error fetching app access token:', err.response?.data || err.message);
      throw new Error('Failed to fetch app access token');
    }
  }

  static async getPublicPageInfo(pageUrlOrId: string): Promise<any> {
    try {
      let pageId = pageUrlOrId;
      if (pageUrlOrId.includes('facebook.com')) {
        const match = pageUrlOrId.match(/facebook\.com\/(?:profile\.php\?id=)?([^\/?]+)/);
        if (match && match[1]) {
          pageId = match[1];
        } else {
          throw new Error('Invalid Facebook page URL');
        }
      }

      const accessToken = await this.getAppAccessToken();
      const res = await axios.get(`${FB_BASE}/${pageId}`, {
        params: {
          fields: 'id,name,picture,category,about,description,website',
          access_token: accessToken,
        },
      });
      return res.data;
    } catch (err: any) {
      console.error('Error fetching public page info:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.message || 'Failed to fetch page info');
    }
  }

  static async getAccessToken(code: string) {
    try {
      const params = {
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
        code,
      };
      const res = await axios.get(`${FB_BASE}/oauth/access_token`, { params });
      return res.data;
    } catch (err: any) {
      console.error('Error fetching access token:', err.response?.data || err.message);
      throw err;
    }
  }

  static async getProfile(access_token: string) {
    try {
      const res = await axios.get(`${FB_BASE}/me`, {
        params: {
          fields: 'id,name,email,picture',
          access_token,
        },
      });
      return res.data;
    } catch (err: any) {
      console.error('Error fetching profile:', err.response?.data || err.message);
      throw err;
    }
  }

  static async getPages(access_token: string, selectedPageId?: string, selectedPageUrl?: string) {
    try {
      const res = await axios.get(`${FB_BASE}/me/accounts`, {
        params: { access_token },
      });

      const pages = res.data?.data ?? [];
      console.log('Fetched pages:', pages.map((p: any) => ({ id: p.id, name: p.name, link: p.link }))); // Debug log

      let matchedPage = null;

      if (selectedPageId || selectedPageUrl) {
        matchedPage = pages.find((page: any) => {
          return (
            (selectedPageId && page.id === selectedPageId) ||
            (selectedPageUrl && page.link && page.link.includes(selectedPageUrl))
          );
        });
        console.log('Matched page:', matchedPage ? { id: matchedPage.id, name: matchedPage.name } : 'None'); // Debug log
      }

      if (matchedPage) {
        try {
          const [followers, postCount] = await Promise.all([
            this.getPageFollowers(matchedPage.id, matchedPage.access_token),
            this.getPagePostCount(matchedPage.id, matchedPage.access_token),
          ]);

          return {
            data: [
              {
                ...matchedPage,
                followers,
                postCount,
                postingFrequency: postCount / 30,
              },
            ],
          };
        } catch (err: any) {
          console.warn(`Failed to fetch analytics for page ${matchedPage.name}:`, err.response?.data || err.message);
          return {
            data: [
              {
                ...matchedPage,
                followers: null,
                postCount: null,
                postingFrequency: null,
                error: true,
              },
            ],
          };
        }
      }

      // No match or no selectedPageId/url — return full list
      return {
        data: pages.map((page: any) => ({
          ...page,
          followers: null,
          postCount: null,
          postingFrequency: null,
          needsSelection: true,
        })),
        message: 'No matching page found. Please select one.',
      };
    } catch (err: any) {
      console.error('Error fetching pages:', err.response?.data || err.message);
      throw err;
    }
  }

  static async getPageFollowers(pageId: string, token: string) {
    try {
      const res = await axios.get(`${FB_BASE}/${pageId}?fields=fan_count`, {
        params: { access_token: token },
      });
      return res.data.fan_count || 0;
    } catch (err: any) {
      console.error(`Error fetching followers for page ${pageId}:`, err.response?.data || err.message);
      return 0;
    }
  }

  static async getPagePostCount(pageId: string, token: string) {
    try {
      const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
        params: { access_token: token, since: this.thirtyDaysAgo, limit: 100 },
      });
      return res.data.data?.length || 0;
    } catch (err: any) {
      console.error(`Error fetching post count for page ${pageId}:`, err.response?.data || err.message);
      return 0;
    }
  }

  static async getPageMetrics(pageId: string, token: string) {
    try {
      const followers = await this.getPageFollowers(pageId, token);

      const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
        params: {
          fields: 'likes.summary(true),comments.summary(true),created_time',
          access_token: token,
          since: this.thirtyDaysAgo,
          limit: 100,
        },
      });

      const posts = res.data.data || [];
      let totalLikes = 0;
      let totalComments = 0;
      const dailyMetrics: { [date: string]: any } = {};

      // Init last 30 days with zero values
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const isoDate = date.toISOString().split('T')[0];
        dailyMetrics[isoDate] = {
          views: 0,
          likes: 0,
          comments: 0,
          engagementRate: 0,
          postCount: 0,
        };
      }

      posts.forEach((post: any) => {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        totalLikes += likes;
        totalComments += comments;

        const date = post.created_time.split('T')[0];
        if (dailyMetrics[date]) {
          dailyMetrics[date].likes += likes;
          dailyMetrics[date].comments += comments;
          dailyMetrics[date].postCount += 1;
        }
      });

      // Fetch impressions (views)
      try {
        const insightsRes = await axios.get(`${FB_BASE}/${pageId}/insights`, {
          params: {
            metric: 'page_impressions',
            period: 'day',
            since: this.thirtyDaysAgo,
            until: Math.floor(Date.now() / 1000),
            access_token: token,
          },
        });

        const impressionsData = insightsRes.data.data.find((d: any) => d.name === 'page_impressions');
        if (impressionsData) {
          impressionsData.values.forEach((val: any) => {
            const date = val.end_time.split('T')[0];
            if (dailyMetrics[date]) {
              dailyMetrics[date].views = val.value;
            }
          });
        }
      } catch (e: any) {
        console.warn(`Page impressions fetch failed:`, e.response?.data || e.message);
      }

      // Final engagementRate calculation
      Object.entries(dailyMetrics).forEach(([date, metrics]) => {
        const { likes, comments, views } = metrics;
        const engagement = likes + comments;
        metrics.engagementRate = views > 0 ? (engagement / views) * 100 : 0;
      });

      const totalEngagement = followers > 0 ? (totalLikes + totalComments) / followers * 100 : 0;

      return {
        followers,
        totalEngagement,
        engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
        postingFrequency: posts.length / 30,
        dailyMetrics,
      };
    } catch (err: any) {
      console.error(`Failed to fetch page metrics:`, err.response?.data || err.message);
      const followers = await this.getPageFollowers(pageId, token);
      const postCount = await this.getPagePostCount(pageId, token);
      return {
        followers,
        totalEngagement: 0,
        engagementToFollowerRatio: 0,
        postingFrequency: postCount / 30,
        dailyMetrics: {},
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }

  static async getInstagramMetrics(pageId: string, pageToken: string) {
    try {
      const igAccount = await this.getInstagramBusinessAccount(pageId, pageToken);
      if (!igAccount?.instagram_business_account?.id) return null;

      const igId = igAccount.instagram_business_account.id;

      const followersRes = await axios.get(`${FB_BASE}/${igId}`, {
        params: { fields: 'followers_count', access_token: pageToken },
      });
      const followers = followersRes.data.followers_count || 0;

      const mediaRes = await axios.get(`${FB_BASE}/${igId}/media`, {
        params: {
          fields: 'like_count,comments_count,timestamp',
          access_token: pageToken,
          limit: 30,
          since: this.thirtyDaysAgo,
        },
      });

      const posts = mediaRes.data.data || [];
      let totalLikes = 0;
      let totalComments = 0;
      const dailyMetrics: { [date: string]: any } = {};

      // Init last 30 days with zeros
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const isoDate = date.toISOString().split('T')[0];
        dailyMetrics[isoDate] = {
          views: 0,
          likes: 0,
          comments: 0,
          engagementRate: 0,
          postCount: 0,
        };
      }

      posts.forEach((post: any) => {
        const likes = post.like_count || 0;
        const comments = post.comments_count || 0;
        totalLikes += likes;
        totalComments += comments;

        const date = post.timestamp.split('T')[0];
        if (dailyMetrics[date]) {
          dailyMetrics[date].likes += likes;
          dailyMetrics[date].comments += comments;
          dailyMetrics[date].postCount += 1;
        }
      });

      // Try fetching impressions
      try {
        const insightsRes = await axios.get(`${FB_BASE}/${igId}/insights`, {
          params: {
            metric: 'impressions',
            period: 'day',
            since: this.thirtyDaysAgo,
            until: Math.floor(Date.now() / 1000),
            access_token: pageToken,
          },
        });

        const impressionsData = insightsRes.data.data.find((d: any) => d.name === 'impressions');
        if (impressionsData) {
          impressionsData.values.forEach((val: any) => {
            const date = val.end_time.split('T')[0];
            if (dailyMetrics[date]) {
              dailyMetrics[date].views = val.value;
            }
          });
        }
      } catch (e: any) {
        console.warn(`Instagram impressions fetch failed:`, e.response?.data || e.message);
      }

      Object.entries(dailyMetrics).forEach(([date, metrics]) => {
        const { likes, comments, views } = metrics;
        const engagement = likes + comments;
        metrics.engagementRate = views > 0 ? (engagement / views) * 100 : 0;
      });

      const totalEngagement = totalLikes + totalComments;

      return {
        followers,
        totalEngagement,
        engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
        postingFrequency: posts.length / 30,
        dailyMetrics,
      };
    } catch (err: any) {
      console.error(`Failed to fetch Instagram metrics:`, err.response?.data || err.message);
      return null;
    }
  }

  static async getInstagramBusinessAccount(pageId: string, pageToken: string) {
    try {
      const res = await axios.get(`${FB_BASE}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageToken,
        },
      });
      return res.data;
    } catch (err: any) {
      console.error(`Error fetching Instagram business account for page ${pageId}:`, err.response?.data || err.message);
      return null;
    }
  }
}