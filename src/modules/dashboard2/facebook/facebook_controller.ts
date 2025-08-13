import { Request, Response } from 'express';
import { getFacebookPostsFromScrapedData } from './facebook.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// export const getFacebookPostsHandler = async (req: Request, res: Response) => {
//     console.log("starting facebook anaylsis ...")

//   try {
 
//   const { report_id, website_id, user_id, facebook_handle } = req.body;

//   if (!report_id) {
//     return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
//   }

//   // If handle is provided → save/update first
//   if (facebook_handle) {
//     await prisma.website_scraped_data.update({
//       where: { report_id },
//       data: { facebook_handle }
//     });
//   }
//   let websiteData 
//   if (!facebook_handle) {
//   websiteData = await prisma.website_scraped_data.findUnique({
//     where: { report_id },
//     select: { facebook_handle: true }
//   });
// }


 

//     if (!websiteData?.facebook_handle) {
//       return res.status(404).json({ success: false, error: 'facebook_handle not found for scraped_data_id' });
//     }
//     const facebook_data = await getFacebookPostsFromScrapedData(websiteData.facebook_handle);

//     const existingReport = await prisma.report.findUnique({
//       where: { report_id },
//       select: { dashboard2_data: true }
//     });

// // ✅ Safe check before spreading
//   let mergedDashboard2Data: any;

//   if (
//     existingReport?.dashboard2_data &&
//     typeof existingReport.dashboard2_data === 'object' &&
//     !Array.isArray(existingReport.dashboard2_data)
//   ) {
//     mergedDashboard2Data = {
//       ...existingReport.dashboard2_data,
      
     
//         ...facebook_data
      
      
//     };
//   } else {
//     mergedDashboard2Data = facebook_data ;
//   }

//   await prisma.report.upsert({
//     where: { report_id },
//     update: {
//       website_id,
//       dashboard2_data: mergedDashboard2Data
//     },
//     create: {
//       website_id,
//       dashboard2_data:  facebook_data 
//     }
//   });
       
  
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

//     console.log("facebook anaylsis complete")
   
//     return res.json(facebook_data);

//   } catch (error) {
//     console.error("Error in getFacebookPostsHandler:", error);
//     return res.status(500).json({ success: false, error: 'Internal Server Error' });
//   }
// };



export const getFacebookPostsHandler = async (req: Request, res: Response) => {
  console.log("starting facebook analysis...");

  try {
    const { report_id, website_id, user_id, facebook_handle } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
    }
     if (!facebook_handle) {
      return res.status(400).json({ success: false, error: 'Missing facebook_handle in request body' });
    }
    // Save or create facebook_handle if provided
    if (facebook_handle) {
      console.log("Saving facebook_handle to database...");
      await prisma.user_requirements.upsert({
        where: { website_id },
        update: { facebook_handle },
        create: { website_id, facebook_handle, user_id }
      });
      
    }


    const facebook_data = await getFacebookPostsFromScrapedData(facebook_handle);

    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true }
    });

    let mergedDashboard2Data: any = facebook_data;
    if (existingReport?.dashboard2_data && typeof existingReport.dashboard2_data === 'object' && !Array.isArray(existingReport.dashboard2_data)) {
      mergedDashboard2Data = {
        ...existingReport.dashboard2_data,
        ...facebook_data
      };
    }

    await prisma.report.upsert({
      where: { report_id },
      update: { website_id, dashboard2_data: mergedDashboard2Data },
      create: { report_id, website_id, dashboard2_data: facebook_data }
    });

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

    console.log("facebook analysis complete");
    return res.json(facebook_data);

  } catch (error) {
    console.error("Error in getFacebookPostsHandler:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
