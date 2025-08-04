import express, { Request, Response } from 'express';
import { FacebookService } from './facebook.service';
import axios from 'axios';
import querystring from 'querystring';

import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();
const router = express.Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Redirects user to Facebook login
router.get('/login', (req: Request, res: Response) => {
  const authUrl = FacebookService.getAuthUrl();
  res.redirect(authUrl);
});



router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;
 
  console.log("➡️ Incoming /callback request");
  console.log("🔹 Query Params:", { code });

  // 🔹 Case 1: Handle OAuth callback
  
    console.log("🔄 Handling OAuth code exchange...");
    try {
      const { access_token: userAccessToken } = await FacebookService.getAccessToken(code);
      console.log("✅ Received user access token:", userAccessToken);

      const userProfile = await FacebookService.getProfile(userAccessToken);
      console.log("✅ Fetched user profile:", userProfile);

      // req.session.access_token = userAccessToken;
      req.session.profile = userProfile;

      const pages = await FacebookService.getPages(userAccessToken);
      req.session.pages = pages;

      console.log("📄 Retrieved pages:", pages);
    
      return res.json({
       pages
      });
    } catch (err) {
      console.error('❌ Error during OAuth flow:', err);
      return res.status(500).json({ error: 'OAuth login failed' });
    }
  }


));



router.post('/save-pages', asyncHandler(async (req: Request, res: Response) => {
  const pages = req.body.pages;
  const profile = req.body.profile;
  const report_id = req.body.report_id
  const website_id = req.body.website_id

     const record = await prisma.report.upsert({
      where: {
        report_id: report_id, // this must be a UNIQUE constraint or @id in the model
      },
      update: {
        scraped_data_id: pages
        // add any other fields you want to update
      },
      
      create: {
        website_id: website_id,
        scraped_data_id: pages
        // add any other fields required for creation
      }
});

  return res.json({ status: 'saved' });
}));


export default router;