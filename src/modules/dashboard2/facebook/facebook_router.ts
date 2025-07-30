
import express, { Request, Response } from 'express';
import { FacebookService } from './facebook.service';

const router = express.Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Entry point — redirects user to Facebook login
router.get('/login', (req: Request, res: Response) => {
  const url = FacebookService.getAuthUrl();
  console.log("🔗 Redirecting to:", url);
  res.redirect(url);
});

// Callback endpoint after Facebook login
router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Missing code');

  // 1. Exchange code for access token
  const tokenData = await FacebookService.getAccessToken(code);
  const access_token = tokenData.access_token;
  console.log("✅ Token Data:", tokenData);

  // 2. Get user profile
  const profile = await FacebookService.getProfile(access_token);
  console.log("👤 Profile:", profile);

  // 3. Get user-managed pages
  const pages = await FacebookService.getPages(access_token);
  if (!pages.data || pages.data.length === 0) {
    return res.status(400).json({ error: 'No pages found' });
  }

  // 4. Auto-select first page or your own logic
  const selectedPage = pages.data[0];
  console.log("📄 Selected Page:", selectedPage);

  // 5. Fetch page access token
  const pageAccessToken = selectedPage.access_token;
  const pageId = selectedPage.id;
  // const bio = await FacebookService.getPageBio(pageId, pageAccessToken);

  // // 6. Get followers, posts, and IG info
  // const [followers, postCount, instagramInfo] = await Promise.all([
  //   FacebookService.getPageFollowers(pageId, pageAccessToken),
  //   FacebookService.getPagePostCount(pageId, pageAccessToken),
  //   FacebookService.getInstagramInfo(pageId, pageAccessToken)
    
  // ]);
  console.log("pages",pages)
  return res.json({
    access_token,
    user: profile,
    page: selectedPage,
    insights: {
     pages
    }
  });
}));



export default router;

