import { Request, Response } from 'express';
import { getInstagramPostsFromScrapedData } from './instagram.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// export const getInstagramPostsHandler = async (req: Request, res: Response) => {
//   try {
//     const { report_id } = req.body;
//     const { website_id } = req.body;
//     const { user_id } = req.body;

//     if (!report_id) {
//       return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
//     }

//     const report = await prisma.report.findUnique({
//       where: { report_id },
//       select: { scraped_data_id: true }
//     });

//     if (!report?.scraped_data_id) {
//       return res.status(404).json({ success: false, error: 'scraped_data_id not found for report_id' });
//     }

//     // Get Instagram_handle using scraped_data_id
//     const websiteData = await prisma.website_scraped_data.findUnique({
//       where: { scraped_data_id: report.scraped_data_id },
//       select: { instagram_handle: true }
//     });

//     if (!websiteData?.instagram_handle) {
//       return res.status(404).json({ success: false, message: 'Instagram_handle not found' });
//     }
//     console.log("instagram_handle", websiteData.instagram_handle)
//     const Instagram_data = await getInstagramPostsFromScrapedData(websiteData.instagram_handle);

   
//     const existingReport = await prisma.report.findUnique({
//       where: { report_id },
//       select: { dashboard2_data: true }
//     });

//     // ✅ Safe check before spreading
//     let mergedDashboard2Data: any;

//     if (
//       existingReport?.dashboard2_data &&
//       typeof existingReport.dashboard2_data === 'object' &&
//       !Array.isArray(existingReport.dashboard2_data)
//     ) {
//       mergedDashboard2Data = {
//         ...existingReport.dashboard2_data,
//         ...Instagram_data // flatten inside this key

//       };
//     } else {
//       mergedDashboard2Data = Instagram_data;
//     }

//     await prisma.report.upsert({
//       where: { report_id },
//       update: {
//         website_id,
//         dashboard2_data: mergedDashboard2Data
//       },
//       create: {
//         website_id,
//         dashboard2_data: Instagram_data
//       }
//     });


//     const existing = await prisma.analysis_status.findFirst({
//       where: { report_id }
//     });

//     if (existing) {
//       await prisma.analysis_status.update({
//         where: { id: existing.id },
//         data: {
//           website_id,
//           social_media_anaylsis: true
//         }
//       });
//     } else {
//       await prisma.analysis_status.create({
//         data: {
//           report_id,
//           website_id,
//           social_media_anaylsis: true,
//           user_id
//         }
//       });
//     }
//     return res.json(Instagram_data);

//   } catch (error) {
//     console.error("Error in getInstagramPostsHandler:", error);
//     return res.status(500).json({ success: false, error: 'Internal Server Error' });
//   }
// };



export const getInstagramPostsHandler = async (req: Request, res: Response) => {
  console.log("starting Instagram analysis...");

  try {
    const { report_id, website_id, user_id, instagram_handle } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
    }

    // If handle is provided → save/update first
    if (instagram_handle) {
      await prisma.user_requirements.upsert({
        where: { website_id },
        update: { instagram_handle },
        create: { website_id, instagram_handle, user_id }

      });
    }

    // Always get handle — either from request or DB
    const handleToUse = instagram_handle ?? (await prisma.user_requirements.findUnique({
      where: { website_id },
      select: { instagram_handle: true }
    }))?.instagram_handle;

    if (!handleToUse) {
      return res.status(404).json({ success: false, error: 'instagram_handle not found' });
    }

    console.log("instagram_handle", handleToUse);
    const Instagram_data = await getInstagramPostsFromScrapedData(handleToUse);

    // Merge dashboard2_data
    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true }
    });

    let mergedDashboard2Data: any = Instagram_data;
    if (existingReport?.dashboard2_data && typeof existingReport.dashboard2_data === 'object' && !Array.isArray(existingReport.dashboard2_data)) {
      mergedDashboard2Data = { ...existingReport.dashboard2_data, ...Instagram_data };
    }

    await prisma.report.upsert({
      where: { report_id },
      update: { website_id, dashboard2_data: mergedDashboard2Data },
      create: { report_id, website_id, dashboard2_data: Instagram_data }
    });

    // Update analysis status
    const existingStatus = await prisma.analysis_status.findFirst({ where: { report_id } });
    if (existingStatus) {
      await prisma.analysis_status.update({
        where: { id: existingStatus.id },
        data: { website_id, social_media_anaylsis: true }
      });
    } else {
      await prisma.analysis_status.create({
        data: { report_id, website_id, social_media_anaylsis: true, user_id }
      });
    }

    console.log("Instagram analysis complete");
    return res.json(Instagram_data);

  } catch (error) {
    console.error("Error in getInstagramPostsHandler:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
