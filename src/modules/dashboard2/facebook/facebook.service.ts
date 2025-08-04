
import axios from 'axios';
import qs from 'querystring';

const FB_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookService {
  private static thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  static getAuthUrl(): string {
    const params = qs.stringify({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      scope: 'email,public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,instagram_basic,instagram_manage_insights',
      response_type: 'code',

      auth_type:"rerequest",
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }



  static async getAccessToken(code: string) {
    try {
      const params = {
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
        // auth_type:"rerequest",

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

  // static async getPages(access_token: string) {
  //   try {
  //     const res = await axios.get(`${FB_BASE}/me/accounts`, {
  //       params: { access_token },
  //     });
  //     console.log("res",res)
  //     const pages = res.data?.data ?? [];
  //     console.log("pages",pages)
  //     const enrichedPages = await Promise.all(
  //       pages.map(async (page: any) => {
  //         try {
  //           const [followers, postCount,pageMetrics,instagram_basic] = await Promise.all([
  //             this.getPageFollowers(page.id, page.access_token),
  //             this.getPagePostCount(page.id, page.access_token),
  //             this.getPageMetrics(page.id,page.token),
  //             this.getInstagramMetrics(page.id,page.token)
  //           ]);
  //           return {
  //             ...page,
  //             followers,
  //             postCount,
  //             postingFrequency: postCount / 30,
  //             pageMetrics,
  //             instagram_basic
  //           };
  //         } catch (err: any) {
  //           console.warn(`Failed to fetch analytics for page ${page.name}:`, err.response?.data || err.message);
  //           return { ...page, followers: null, postCount: null, postingFrequency: null, error: true };
  //         }
  //       })
  //     );

  //     return { data: enrichedPages,pages };
  //   } catch (err: any) {
  //     console.error('Error fetching pages:', err.response?.data || err.message);
  //     throw err;
  //   }
  // }


static async getPages(access_token: string) {
  try {
    const res = await axios.get(`${FB_BASE}/me/accounts`, {
      params: { access_token },
    });
    const pages = res.data?.data ?? [];
    console.log("pages", pages);

    const enrichedPages = await Promise.all(
      pages.map(async (page: any) => {
        try {
          const [followers, postCount, pageMetrics, instagram_basic] = await Promise.all([
            this.getPageFollowers(page.id, page.access_token),
            this.getPagePostCount(page.id, page.access_token),
            this.getPageMetrics(page.id, page.access_token),
            this.getInstagramMetrics(page.id, page.access_token),
          ]);

          return {
            ...page,
            followers,
            postCount,
            postingFrequency: postCount / 30,
            pageMetrics,
            instagram_basic,
          };
        } catch (err: any) {
          const errorMessage = err.response?.data?.error?.message || err.message;
          if (errorMessage.includes('valid app ID')) {
            console.warn(`Skipping page ${page.name} due to invalid App ID: ${errorMessage}`);
            return null; // Skip page with invalid app ID
          }
          console.warn(`Failed to fetch analytics for page ${page.name}:`, errorMessage);
          return { ...page, followers: null, postCount: null, postingFrequency: null, error: true };
        }
      })
    );
    await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
        params: { access_token }
      });
      console.log('✅ Permissions revoked.');

    return { data: enrichedPages.filter(page => page !== null), pages };
  } catch (err: any) {
    const errorMessage = err.response?.data?.error?.message || err.message;
    console.error('Error fetching pages:', errorMessage);
    if (errorMessage.includes('valid app ID')) {
      throw new Error('Invalid Facebook App ID. Please check your App ID configuration in the Facebook Developer Portal.');
    }
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
      // Fetch followers
      const followers = await this.getPageFollowers(pageId, token);

      // Fetch posts with likes and comments
      const res = await axios.get(`${FB_BASE}/${pageId}/posts`, {
        params: {
          fields: 'likes.summary(true),comments.summary(true),created_time',
          access_token: token,
          since: this.thirtyDaysAgo,
          limit: 100,
        },
      });

      const posts = res.data.data || [];
      const postCount = posts.length;
      let totalLikes = 0;
      let totalComments = 0;
      const dailyMetrics: { [date: string]: any } = {};

      posts.forEach((post: any) => {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        totalLikes += likes;
        totalComments += comments;

        const date = post.created_time.split('T')[0];
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            views: 0, // Impressions not available without insights
            likes: 0,
            comments: 0,
            engagementRate: 0,
            postCount: 0,
          };
        }
        dailyMetrics[date].likes += likes;
        dailyMetrics[date].comments += comments;
        dailyMetrics[date].postCount += 1;
      });

      Object.keys(dailyMetrics).forEach(date => {
        const engagement = dailyMetrics[date].likes + dailyMetrics[date].comments;
        dailyMetrics[date].engagementRate = followers ? (engagement / followers) * 100 : 0;
      });

      const totalEngagement = totalLikes + totalComments;

      // Try fetching impressions from insights (optional, as it may fail)
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
      } catch (insightsErr: any) {
        console.warn(`Failed to fetch page impressions for ${pageId}:`, insightsErr.response?.data || insightsErr.message);
      }

      return {
        followers,
        totalEngagement,
        engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
        postingFrequency: postCount / 30,
        dailyMetrics,
      };
    } catch (err: any) {
      console.error(`Failed to fetch page metrics for ${pageId}:`, err.response?.data || err.message);
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
      const instagramAccount = await this.getInstagramBusinessAccount(pageId, pageToken);
      if (!instagramAccount?.instagram_business_account?.id) {
        console.warn(`No Instagram business account connected to page ${pageId}`);
        return null;
      }

      const igAccountId = instagramAccount.instagram_business_account.id;

      // Fetch Instagram followers
      const followersRes = await axios.get(`${FB_BASE}/${igAccountId}`, {
        params: { fields: 'followers_count', access_token: pageToken },
      });
      const followers = followersRes.data.followers_count || 0;

      // Fetch Instagram media
      const mediaRes = await axios.get(`${FB_BASE}/${igAccountId}/media`, {
        params: {
          fields: 'like_count,comments_count,timestamp',
          access_token: pageToken,
          limit: 30,
          since: this.thirtyDaysAgo,
        },
      });

      const posts = mediaRes.data.data || [];
      const postCount = posts.length;
      let totalLikes = 0;
      let totalComments = 0;
      const dailyMetrics: { [date: string]: any } = {};

      posts.forEach((post: any) => {
        const likes = post.like_count || 0;
        const comments = post.comments_count || 0;
        totalLikes += likes;
        totalComments += comments;

        const date = post.timestamp.split('T')[0];
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            views: 0, // Impressions require insights
            likes: 0,
            comments: 0,
            engagementRate: 0,
            postCount: 0,
          };
        }
        dailyMetrics[date].likes += likes;
        dailyMetrics[date].comments += comments;
        dailyMetrics[date].postCount += 1;
      });

      Object.keys(dailyMetrics).forEach(date => {
        const engagement = dailyMetrics[date].likes + dailyMetrics[date].comments;
        dailyMetrics[date].engagementRate = followers ? (engagement / followers) * 100 : 0;
      });

      const totalEngagement = totalLikes + totalComments;

      // Try fetching impressions from insights (optional)
      try {
        const insightsRes = await axios.get(`${FB_BASE}/${igAccountId}/insights`, {
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
      } catch (insightsErr: any) {
        console.warn(`Failed to fetch Instagram impressions for ${igAccountId}:`, insightsErr.response?.data || insightsErr.message);
      }

      return {
        followers,
        totalEngagement,
        engagementToFollowerRatio: followers ? totalEngagement / followers : 0,
        postingFrequency: postCount / 30,
        dailyMetrics,
      };
    } catch (err: any) {
      console.error(`Failed to fetch Instagram metrics for page ${pageId}:`, err.response?.data || err.message);
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