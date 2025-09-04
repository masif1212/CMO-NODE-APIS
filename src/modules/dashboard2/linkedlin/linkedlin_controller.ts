import { Request, Response } from 'express';
import { getlinkedinProfileFromScrapedData } from './linkedlin_service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getLinkedinPostsHandler = async (req: Request, res: Response) => {
  console.log("starting LinkedIn analysis...");

  try {
    const { report_id, website_id, user_id, linkedin_handle } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
    }
      if (!linkedin_handle) {
      return res.status(400).json({ success: false, error: 'Missing linkedin_handle in request body' });
    }
    // If handle is provided → save/update first
    if (linkedin_handle) {
      await prisma.user_requirements.upsert({
        where: { website_id },
        update: { linkedin_handle },
        create: { website_id, linkedin_handle, user_id }

      });
    }


    const linkedin_data = await getlinkedinProfileFromScrapedData(linkedin_handle);
    console.log("linkedin_data",linkedin_data)
    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true }
    });

    let mergedDashboard2Data: any = linkedin_data;
    if (existingReport?.dashboard2_data && typeof existingReport.dashboard2_data === 'object' && !Array.isArray(existingReport.dashboard2_data)) {
      mergedDashboard2Data = { ...existingReport.dashboard2_data, ...linkedin_data };
    }

    // Upsert report
    await prisma.report.upsert({
      where: { report_id },
      update: { website_id, dashboard2_data: mergedDashboard2Data },
      create: { report_id, website_id, dashboard2_data: linkedin_data }
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

    console.log("LinkedIn analysis complete");
    return res.json(linkedin_data);

  } catch (error) {
    console.error("Error in getLinkedinPostsHandler:", error);
    return res.status(500).json({ success: false, error });
  }
};
