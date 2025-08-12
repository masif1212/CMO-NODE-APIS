import { Request, Response } from "express";
import { analyzeYouTubeDataByWebsiteId } from "./youtubeAnalysis";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export const analyzeYouTubeController = async (req: Request, res: Response) => {
  const { website_id, report_id, user_id, youtube_handle } = req.body;

  if (!website_id || !report_id) {
    return res.status(400).json({ error: "website_id and report_id are required" });
  }

  try {
    // If handle is provided → save/update it first
    if (youtube_handle) {
      await prisma.user_requirements.update({
        where: { website_id },
        data: { youtube_handle }
      });
    }

    // Always get the handle — either from body or DB
    const handleToUse = youtube_handle ?? (
      await prisma.user_requirements.findUnique({
        where: { website_id },
        select: { youtube_handle: true }
      })
    )?.youtube_handle;

    if (!handleToUse) {
      console.warn("No YouTube handle found");
      return res.status(200).json({
        message: "no-youtube-handle",
        profile: null,
        engagement_rate: null,
        postingFrequency: null,
        perPostEngagement: null,
      });
    }

    console.log("YouTube handle found:", handleToUse);

    // Analyze YouTube
    const youtube_data = await analyzeYouTubeDataByWebsiteId(handleToUse);

    // Merge with dashboard2_data
    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true }
    });

    let mergedDashboard2Data: any = youtube_data;
    if (existingReport?.dashboard2_data && typeof existingReport.dashboard2_data === "object" && !Array.isArray(existingReport.dashboard2_data)) {
      mergedDashboard2Data = { ...existingReport.dashboard2_data, ...youtube_data };
    }

    // Upsert report
    await prisma.report.upsert({
      where: { report_id },
      update: { website_id, dashboard2_data: mergedDashboard2Data },
      create: { report_id, website_id, dashboard2_data: youtube_data }
    });

    // Update or create analysis_status
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

    console.log("YouTube analysis complete");
    return res.status(200).json(youtube_data);

  } catch (error: any) {
    console.error("Error analyzing YouTube data:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};



// export const analyzeYouTubeController = async (req: Request, res: Response) => {
//   const { website_id, report_id ,user_id} = req.body;

//   if (!website_id || !report_id) {
//     return res.status(400).json({ error: "website_id and report_id are required" });
//   }

//   try {
//     const existingReport = await prisma.report.findUnique({
//       where: { report_id },
//       select: {
//         scraped_data_id: true,
//         dashboard2_data: true
//       }
//     });

//     if (!existingReport?.scraped_data_id) {
//       return res.status(404).json({ error: "No scraped data associated with this report" });
//     }

//     console.log("Fetching youtube_handle from scraped data:", existingReport.scraped_data_id);

//     const scrapedData = await prisma.website_scraped_data.findUnique({
//       where: { scraped_data_id: existingReport.scraped_data_id },
//       select: { youtube_handle: true },
//     });

//     if (!scrapedData?.youtube_handle) {
//       console.warn("No YouTube handle found");
//       return res.status(200).json({
//         message: "no-youtube-handle",
//         profile: null,
//         engagement_rate: null,
//         postingFrequency: null,
//         perPostEngagement: null,
//       });
//     }

//     console.log("YouTube handle found:", scrapedData.youtube_handle);

//     const youtube_handle = scrapedData.youtube_handle;
//     const youtube_data = await analyzeYouTubeDataByWebsiteId(youtube_handle);

//     // Merge with existing dashboard2_data if it exists
//     const mergedDashboard2Data =
//       existingReport.dashboard2_data &&
//       typeof existingReport.dashboard2_data === 'object' &&
//       !Array.isArray(existingReport.dashboard2_data)
//         ? { ...existingReport.dashboard2_data, ...youtube_data }
//         : youtube_data;

//     // Update or create report
//     await prisma.report.upsert({
//       where: { report_id },
//       update: {
//         website_id,
//         dashboard2_data: mergedDashboard2Data
//       },
//       create: {
//         report_id,
//         website_id,
//         dashboard2_data: youtube_data
//       }
//     });
      
//   const existing = await prisma.analysis_status.findFirst({
//   where: { report_id }
// });

// if (existing) {
//   await prisma.analysis_status.update({
//     where: { id: existing.id },
//     data: {
//       website_id,
//       social_media_anaylsis: true
//     }
//   });
// } else {
//   await prisma.analysis_status.create({
//     data: {
//       report_id,
//       website_id,
//       social_media_anaylsis: true,
//       user_id
//     }
//   });
// }
//     console.log("YouTube analysis complete");
//     return res.status(200).json(youtube_data);

//   } catch (error: any) {
//     console.error("Error analyzing YouTube data:", error);
//     return res.status(500).json({ error: "Internal Server Error", message: error.message });
//   }
// };
