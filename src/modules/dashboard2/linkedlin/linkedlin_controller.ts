import { Request, Response } from 'express';
import { getlinkedlinProfileFromScrapedData } from './linkedlin_service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getlinkedlinPostsHandler = async (req: Request, res: Response) => {
    console.log("starting linkedlin anaylsis ...")

  try {
    const { report_id } = req.body;
     const { website_id} = req.body;
     const { user_id } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
    }

    const report = await prisma.report.findUnique({
      where: { report_id },
      select: { scraped_data_id: true }
    });

    if (!report?.scraped_data_id) {
      return res.status(404).json({ success: false, error: 'scraped_data_id not found for report_id' });
    }

    // Get linkedlin_handle using scraped_data_id
    const websiteData = await prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report.scraped_data_id },
      select: { linkedin_handle: true }
    });

    if (!websiteData?.linkedin_handle) {
      return res.status(404).json({ success: false, error: 'linkedlin_handle not found for scraped_data_id' });
    }
    const linkedlin_data = await getlinkedlinProfileFromScrapedData(websiteData.linkedin_handle);

    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true }
    });

// ✅ Safe check before spreading
  let mergedDashboard2Data: any;

  if (
    existingReport?.dashboard2_data &&
    typeof existingReport.dashboard2_data === 'object' &&
    !Array.isArray(existingReport.dashboard2_data)
  ) {
    mergedDashboard2Data = {
      ...existingReport.dashboard2_data,
      
     
        ...linkedlin_data
      
      
    };
  } else {
    mergedDashboard2Data = linkedlin_data ;
  }

  await prisma.report.upsert({
    where: { report_id },
    update: {
      website_id,
      dashboard2_data: mergedDashboard2Data
    },
    create: {
      website_id,
      dashboard2_data:  linkedlin_data 
    }
  });
       
  
  const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

if (existing) {
  await prisma.analysis_status.update({
    where: { id: existing.id },
    data: {
      website_id,
      social_media_anaylsis: true
    }
  });
} else {
  await prisma.analysis_status.create({
    data: {
      report_id,
      website_id,
      social_media_anaylsis: true,
      user_id
    }
  });
}

    console.log("linkedlin anaylsis complete")
   
    return res.json(linkedlin_data);

  } catch (error) {
    console.error("Error in getlinkedlinPostsHandler:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
