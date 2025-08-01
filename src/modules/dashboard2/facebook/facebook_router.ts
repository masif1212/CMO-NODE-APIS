import express, { Request, Response } from 'express';
import { FacebookService } from './facebook.service';

const router = express.Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Redirects user to Facebook login
router.get('/login', (req: Request, res: Response) => {
  const authUrl = FacebookService.getAuthUrl();
  res.redirect(authUrl);
});

// Callback endpoint after Facebook login
// router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
//   const code = req.query.code as string;
//   if (!code) {
//     return res.status(400).json({ error: 'Missing authorization code' });
//   }

//   try {
//     // Exchange code for access token
//     const { access_token } = await FacebookService.getAccessToken(code);

//     // Fetch user profile
//     const profile = await FacebookService.getProfile(access_token);

//     // Fetch user-managed pages
//     const pages = await FacebookService.getPages(access_token);
//     if (!pages.data || pages.data.length === 0) {
//       return res.status(400).json({ error: 'No pages found' });
//     }

//     // Select first page
//     const selectedPage = pages.data[0];
//     const pageId = selectedPage.id;
//     const pageAccessToken = selectedPage.access_token;

//     // Fetch page metrics
//     const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);

//     // Fetch Instagram data if connected
//     const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

//     return res.json({
//       access_token,
//       user: profile,
//       page: { ...selectedPage, metrics: pageMetrics },
//       instagram: instagramData,
//     });
//   } catch (error: any) {
//     console.error('Error in callback:', error.response?.data || error.message);
//     return res.status(500).json({ error: 'Internal server error', details: error.response?.data?.error?.message || error.message });
//   }
// }));



router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange code for access token
    const { access_token } = await FacebookService.getAccessToken(code);

    // Fetch user profile
    const profile = await FacebookService.getProfile(access_token);

    // Fetch user-managed pages
    const pages = await FacebookService.getPages(access_token);
    if (!pages.data || pages.data.length === 0) {
      return res.status(400).json({ error: 'No pages found' });
    }

    // Select first page
    const selectedPage = pages.data[0];
    const pageId = selectedPage.id;
    const pageAccessToken = selectedPage.access_token;

    // Fetch page metrics
    const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);

    // Fetch Instagram data if connected
    const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

    return res.json({
      access_token,
      user: profile,
      page: { ...selectedPage, metrics: pageMetrics },
      instagram: instagramData,
    });
  } catch (error: any) {
    console.error('Error in callback:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.response?.data?.error?.message || error.message });
  }
}));

export default router;