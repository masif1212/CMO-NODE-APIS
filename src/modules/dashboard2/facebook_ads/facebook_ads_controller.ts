import { Request, Response } from 'express';
import { getfacebookAds } from './facebook_ads_service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getfacebookAdsHandler = async (req: Request, res: Response) => {
  console.log("starting facebookAds anaylsis ...")

  try {
    const { report_id } = req.body;
    const { website_id } = req.body;
    const { user_id } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: 'Missing report_id in request body' });
    }

    const website_url = await prisma.user_websites.findUnique({
      where: { website_id },
      select: { website_url: true }
    });

    if (!website_url?.website_url) {
      return res.status(404).json({ success: false, error: 'scraped_data_id not found for report_id' });
    }
    const facebook_ads_data = await getfacebookAds(website_url.website_url);

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


        ...facebook_ads_data


      };
    } else {
      mergedDashboard2Data = facebook_ads_data;
    }

    await prisma.report.upsert({
      where: { report_id },
      update: {
        website_id,
        dashboard2_data: mergedDashboard2Data
      },
      create: {
        website_id,
        dashboard2_data: facebook_ads_data
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

    console.log("facebookAds anaylsis complete")

    return res.json(facebook_ads_data);

  } catch (error) {
    console.error("Error in getfacebookAdsHandler:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
