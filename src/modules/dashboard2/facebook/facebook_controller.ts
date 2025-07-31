// import { Request, Response } from 'express';
// import axios from 'axios';

// const FB_BASE = 'https://graph.facebook.com/v18.0';

// export const handleFacebookCallback = async (req: Request, res: Response) => {
//   const { access_token } = req.query;

//   if (!access_token || typeof access_token !== 'string') {
//     return res.status(400).json({ error: 'Missing access_token' });
//   }

//   try {
//     const pagesRes = await axios.get(`${FB_BASE}/me/accounts`, {
//       params: { access_token },
//     });

//     const pages = pagesRes.data.data;

//     if (!pages || pages.length === 0) {
//       return res.status(400).json({ error: 'No pages found for this user' });
//     }

//     // ✅ Pick first page or implement user-selection later
//     const selectedPage = pages[0];
//     const pageAccessToken = selectedPage.access_token;
//     const pageId = selectedPage.id;

//     const insightsRes = await axios.get(`${FB_BASE}/${pageId}/insights/page_fans`, {
//       params: { access_token: pageAccessToken },
//     });

//     const fanCount = insightsRes.data.data?.[0]?.values?.[0]?.value ?? 0;

//     res.json({
//       page_id: pageId,
//       name: selectedPage.name,
//       followers: fanCount,
//     });
//   } catch (error: any) {
//     console.error('Facebook API error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch Facebook page data' });
//   }
// };
