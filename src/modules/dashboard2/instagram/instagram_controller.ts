import { Request, Response } from 'express';
import { getInstagramPostsFromScrapedData } from './instagram.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInstagramPostsHandler = async (req: Request, res: Response) => {
  try {
    const { report_id } = req.body;

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

    // Get Instagram_handle using scraped_data_id
    const websiteData = await prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report.scraped_data_id },
      select: { instagram_handle: true }
    });

    if (!websiteData?.instagram_handle) {
      return res.status(404).json({ success: false, message: 'Instagram_handle not found' });
    }
    console.log("instagram_handle",websiteData.instagram_handle)
    const Instagram_data  = await getInstagramPostsFromScrapedData(websiteData.instagram_handle);

    return res.json({ success: true, Instagram_data});

  } catch (error) {
    console.error("Error in getInstagramPostsHandler:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
