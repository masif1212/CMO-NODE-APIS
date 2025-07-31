// import express, { Request, Response } from 'express';
// import { FacebookService } from './facebook.service';

// const router = express.Router();

// const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
//   Promise.resolve(fn(req, res, next)).catch(next);
// };


// // import { PrismaClient } from "@prisma/client";
// // const prisma = new PrismaClient();
// // import * as cheerio from "cheerio";

// // router.get('/login/:reportId', asyncHandler (async(req: Request, res: Response) => {
// //   const report_id = req.params.reportId;
// //   const userAccessToken = req.query.token as string;

// //   try {

// //     const report_data = await prisma.report.findFirst({
// //       where: { report_id},
// //       select: { scraped_data_id: true  } 
// //     });

// //     // Step 1: Get scraped_data_id using report_id
// //     const facebook = await prisma.website_scraped_data.findFirst({
// //       where: { scraped_data_id: report_data?.scraped_data_id?? undefined },
// //       select: { facebook_handle: true  } 
// //     });

// //     const facebookHandle = facebook?.facebook_handle;
// //     console.log("facebookHandle",facebookHandle)

// //     // Optional: Add to state for use later
// //     const state = encodeURIComponent(
// //       JSON.stringify({ report_id, facebookHandle })
// //     );

// //     const loginUrl = FacebookService.getAuthUrl(state);

// //     if (userAccessToken) {
// //       const logoutUrl = `https://www.facebook.com/logout.php?next=${encodeURIComponent(
// //         loginUrl
// //       )}&access_token=${userAccessToken}`;
// //       return res.redirect(logoutUrl);
// //     }

// //     return res.redirect(loginUrl);
// //   } catch (error) {
// //     console.error('Error fetching Facebook handle:', error);
// //     return res.status(500).json({ error: 'Failed to fetch Facebook handle' });
// //   }
// // }));


// // // Callback endpoint after Facebook login
// // // router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
// // //   const code = req.query.code as string;
// // //   if (!code) {
// // //     return res.status(400).json({ error: 'Missing authorization code' });
// // //   }

// // //   try {
// // //     // Exchange code for access token
// // //     const { access_token } = await FacebookService.getAccessToken(code);

// // //     // Fetch user profile
// // //     const profile = await FacebookService.getProfile(access_token);

// // //     // Fetch user-managed pages
// // //     const pages = await FacebookService.getPages(access_token);
// // //     if (!pages.data || pages.data.length === 0) {
// // //       return res.status(400).json({ error: 'No pages found' });
// // //     }

// // //     // Select first page
// // //     const selectedPage = pages.data[0];
// // //     const pageId = selectedPage.id;
// // //     const pageAccessToken = selectedPage.access_token;

// // //     // Fetch page metrics
// // //     const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);

// // //     // Fetch Instagram data if connected
// // //     const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

// // //     return res.json({
// // //       access_token,
// // //       user: profile,
// // //       page: { ...selectedPage, metrics: pageMetrics },
// // //       instagram: instagramData,
// // //     });
// // //   } catch (error: any) {
// // //     console.error('Error in callback:', error.response?.data || error.message);
// // //     return res.status(500).json({ error: 'Internal server error', details: error.response?.data?.error?.message || error.message });
// // //   }
// // // }));



// // router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
// //   const code = req.query.code as string;
// //   const stateRaw = req.query.state as string;

// //   let selectedPageId: string | undefined = undefined;
// //   let selectedPageUrl: string | undefined = undefined;

// //   // Parse state
// //   if (stateRaw) {
// //     try {
// //       const state = JSON.parse(decodeURIComponent(stateRaw));
// //       selectedPageId = state.pageId;
// //       selectedPageUrl = state.pageUrl;
// //     } catch (err) {
// //       console.warn('Failed to parse OAuth state param:', err);
// //     }
// //   }

// //   if (!code) {
// //     return res.status(400).json({ error: 'Missing authorization code' });
// //   }

// //   try {
// //     const { access_token } = await FacebookService.getAccessToken(code);
// //     const profile = await FacebookService.getProfile(access_token);

// //     // 🔥 Fetch pages with optional pageId/pageUrl
// //     const pages = await FacebookService.getPages(access_token, selectedPageId, selectedPageUrl);

// //     if (!pages.data || pages.data.length === 0) {
// //       return res.status(400).json({ error: 'No pages found' });
// //     }

// //     const selectedPage = pages.data[0]; // First matched or user will select later
// //     const pageId = selectedPage.id;
// //     const pageAccessToken = selectedPage.access_token;

// //     const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);
// //     const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

// //     return res.json({
// //       access_token,
// //       user: profile,
// //       page: { ...selectedPage, metrics: pageMetrics },
// //       instagram: instagramData,
// //     });
// //   } catch (error: any) {
// //     console.error('Error in callback:', error.response?.data || error.message);
// //     return res.status(500).json({ error: 'Internal server error', details: error.response?.data?.error?.message || error.message });
// //   }
// // }));


// // router.get('/page-info/:pageUrlOrId', asyncHandler(async (req: Request, res: Response) => {
// //   try {
// //     const pageUrlOrId = req.params.pageUrlOrId;
// //     const pageInfo = await FacebookService.getPublicPageInfo(pageUrlOrId);
// //     return res.json(pageInfo);
// //   } catch (error: any) {
// //     console.error('Error fetching page info:', error.message);
// //     return res.status(500).json({ error: 'Failed to fetch page info', details: error.message });
// //   }
// // }));




// // export default router;






// import { PrismaClient } from "@prisma/client";
//  // Adjust path as needed

// const prisma = new PrismaClient();


// router.get('/login/:reportId', asyncHandler(async (req: Request, res: Response) => {
//   const report_id = req.params.reportId;
//   console.log("report_id",report_id)
//   const userAccessToken = req.query.token as string;
//   console.log("userAccessToken",userAccessToken)

//   try {
//     // Fetch report data to get scraped_data_id
//     const report_data = await prisma.report.findFirst({
//       where: { report_id },
//       select: { scraped_data_id: true },
//     });

//     console.log("report_data",report_data)

//     // Fetch facebook_handle using scraped_data_id
//     const facebook = await prisma.website_scraped_data.findFirst({
//       where: { scraped_data_id: report_data?.scraped_data_id ?? undefined },
//       select: { facebook_handle: true },
//     });

//     const facebookHandle = facebook?.facebook_handle;
//     console.log("facebookHandle", facebookHandle);

//     // Extract page ID from facebookHandle
//     let pageId: string | undefined;
//     if (facebookHandle?.includes('facebook.com')) {
//       const match = facebookHandle.match(/facebook\.com\/(?:profile\.php\?id=)?([^\/?]+)/);
//       if (match && match[1]) {
//         pageId = match[1];
//       } else {
//         console.warn('Invalid Facebook handle format:', facebookHandle);
//       }
//     }

//     // Include pageId and facebookHandle in state
//     const state = encodeURIComponent(
//       JSON.stringify({ report_id, facebookHandle, pageId })
//     );

//     const loginUrl = FacebookService.getAuthUrl(state);

//     if (userAccessToken) {
//       const logoutUrl = `https://www.facebook.com/logout.php?next=${encodeURIComponent(
//         loginUrl
//       )}&access_token=${userAccessToken}`;
//       return res.redirect(logoutUrl);
//     }

//     return res.redirect(loginUrl);
//   } catch (error) {
//     console.error('Error fetching Facebook handle:', error);
//     return res.status(500).json({ error: 'Failed to fetch Facebook handle' });
//   }
// }));

// router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
//   const code = req.query.code as string;
//   const stateRaw = req.query.state as string;

//   let selectedPageId: string | undefined = undefined;
//   let selectedPageUrl: string | undefined = undefined;
//   let report_id: string | undefined = undefined;

//   // Parse state
//   if (stateRaw) {
//     try {
//       const state = JSON.parse(decodeURIComponent(stateRaw));
//       selectedPageId = state.pageId;
//       selectedPageUrl = state.facebookHandle;
//       report_id = state.report_id;
//     } catch (err) {
//       console.warn('Failed to parse OAuth state param:', err);
//     }
//   }

//   if (!code) {
//     return res.status(400).json({ error: 'Missing authorization code' });
//   }

//   try {
//     const { access_token } = await FacebookService.getAccessToken(code);
//     const profile = await FacebookService.getProfile(access_token);

//     // Fetch pages with optional pageId/pageUrl
//     const pagesResponse = await FacebookService.getPages(access_token, selectedPageId, selectedPageUrl);

//     if (!pagesResponse.data || pagesResponse.data.length === 0) {
//       return res.status(400).json({ error: 'No pages found in user account' });
//     }

//     // If no match was found and pages are returned with needsSelection: true
//     if (pagesResponse.message && pagesResponse.data.every((page: any) => page.needsSelection)) {
//       return res.status(200).json({
//         access_token,
//         user: profile,
//         pages: pagesResponse.data.map((page: any) => ({
//           id: page.id,
//           name: page.name,
//           category: page.category,
//           link: page.link,
//         })),
//         message: `No page found matching ID ${selectedPageId || selectedPageUrl || 'provided handle'}. Please select a page from the list.`,
//       });
//     }

//     // If a page was matched, proceed with metrics
//     const selectedPage = pagesResponse.data[0];
//     const pageId = selectedPage.id;
//     const pageAccessToken = selectedPage.access_token;

//     const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);
//     const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

//     return res.json({
//       access_token,
//       user: profile,
//       page: { ...selectedPage, metrics: pageMetrics },
//       instagram: instagramData,
//       report_id, // Include report_id for reference
//     });
//   } catch (error: any) {
//     console.error('Error in callback:', error.response?.data || error.message);
//     return res.status(500).json({
//       error: 'Internal server error',
//       details: error.response?.data?.error?.message || error.message,
//     });
//   }
// }));

// router.get('/page-info/:pageUrlOrId', asyncHandler(async (req: Request, res: Response) => {
//   try {
//     const pageUrlOrId = req.params.pageUrlOrId;
//     const pageInfo = await FacebookService.getPublicPageInfo(pageUrlOrId);
//     return res.json(pageInfo);
//   } catch (error: any) {
//     console.error('Error fetching page info:', error.message);
//     return res.status(500).json({ error: 'Failed to fetch page info', details: error.message });
//   }
// }));

// export default router;









import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from 'express';
import { FacebookService } from './facebook.service';

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


const prisma = new PrismaClient();

const router = require("express").Router();

router.get('/login', asyncHandler(async (req: Request, res: Response) => {
  const report_id = req.params.reportId;
  const userAccessToken = req.query.token as string;
  // console.log("report_id",report_id)

  try { 
    // Fetch report data to get scraped_data_id
    const report_data = await prisma.report.findFirst({
      where: { report_id },
      select: { scraped_data_id: true },
    });

    // if (!report_data) {
    //   return res.status(404).json({ error: 'Report not found' });
    // }
    console.log("report_data",report_data?.scraped_data_id)
    // Fetch facebook_handle and website_url using scraped_data_id
    const data = await prisma.website_scraped_data.findFirst({
      where: { scraped_data_id: report_data?.scraped_data_id ?? undefined },
      select: { facebook_handle: true, website_url: true },
    });

    const facebookHandle = data?.facebook_handle;
    // console.log("const facebookHandle = data?.facebook_handle;",data?.facebook_handle)
    const websiteUrl = data?.website_url;
    console.log("facebookHandle", facebookHandle, "websiteUrl", websiteUrl);

    // Extract page ID from facebookHandle
    let pageId: string | undefined;
    if (facebookHandle?.includes('facebook.com')) {
      const match = facebookHandle.match(/facebook\.com\/(?:profile\.php\?id=)?([^\/?]+)/);
      if (match && match[1]) {
        pageId = match[1];
      } else {
        console.warn('Invalid Facebook handle format:', facebookHandle);
      }
    }

    // Include pageId, facebookHandle, and websiteUrl in state
    const state = encodeURIComponent(
      JSON.stringify({ report_id, facebookHandle, websiteUrl, pageId })
    );

    const loginUrl = FacebookService.getAuthUrl(state);

    if (userAccessToken) {
      const logoutUrl = `https://www.facebook.com/logout.php?next=${encodeURIComponent(
        loginUrl
      )}&access_token=${userAccessToken}`;
      return res.redirect(logoutUrl);
    }

    return res.redirect(loginUrl);
  } catch (error) {
    console.error('Error fetching Facebook handle:', error);
    return res.status(500).json({ error: 'Failed to fetch Facebook handle' });
  }
}));

router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const stateRaw = req.query.state as string;

  let selectedPageId: string | undefined = undefined;
  let selectedPageUrl: string | undefined = undefined;
  let websiteUrl: string | undefined = undefined;
  let report_id: string | undefined = undefined;

  // Parse state
  if (stateRaw) {
    try {
      const state = JSON.parse(decodeURIComponent(stateRaw));
      selectedPageId = state.pageId;
      selectedPageUrl = state.facebookHandle;
      websiteUrl = state.websiteUrl;
      report_id = state.report_id;
    } catch (err) {
      console.warn('Failed to parse OAuth state param:', err);
    }
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const { access_token } = await FacebookService.getAccessToken(code);
    const profile = await FacebookService.getProfile(access_token);

    // Fetch pages with optional pageId/pageUrl
    const pagesResponse = await FacebookService.getPages(access_token, selectedPageId, selectedPageUrl);

    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      return res.status(400).json({
        error: 'No pages found in user account',
        message: 'This account does not manage any Facebook pages. Please log in with an account that manages pages.',
      });
    }

    // If no match was found and pages are returned with needsSelection: true
    if (pagesResponse.message && pagesResponse.data.every((page: any) => page.needsSelection)) {
      return res.status(200).json({
        access_token,
        user: profile,
        pages: pagesResponse.data.map((page: any) => ({
          id: page.id,
          name: page.name,
          category: page.category,
          link: page.link,
        })),
        report_id,
        message: `This Facebook page ${selectedPageUrl || 'unknown'} for website ${websiteUrl || 'unknown'} is not managed by this account. Please log in with the account that manages this website. Available pages for this account are listed below.`,
      });
    }

    // If a page was matched, proceed with metrics
    const selectedPage = pagesResponse.data[0];
    const pageId = selectedPage.id;
    const pageAccessToken = selectedPage.access_token;

    const pageMetrics = await FacebookService.getPageMetrics(pageId, pageAccessToken);
    const instagramData = await FacebookService.getInstagramMetrics(pageId, pageAccessToken);

    return res.json({
      access_token,
      user: profile,
      page: { ...selectedPage, metrics: pageMetrics },
      instagram: instagramData,
      report_id,
    });
  } catch (error: any) {
    console.error('Error in callback:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.response?.data?.error?.message || error.message,
    });
  }
}));

router.get('/page-info/:pageUrlOrId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const pageUrlOrId = req.params.pageUrlOrId;
    const pageInfo = await FacebookService.getPublicPageInfo(pageUrlOrId);
    return res.json(pageInfo);
  } catch (error: any) {
    console.error('Error fetching page info:', error.message);
    return res.status(500).json({ error: 'Failed to fetch page info', details: error.message });
  }
}));

export default router;