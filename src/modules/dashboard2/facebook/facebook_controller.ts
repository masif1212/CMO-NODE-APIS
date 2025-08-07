import { Request, Response } from "express";
import { getFacebookPostsFromScrapedData } from "./facebook.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getFacebookPostsHandler = async (req: Request, res: Response) => {
  try {
    const { report_id } = req.body;
    const { website_id } = req.body;

    if (!report_id) {
      return res.status(400).json({ success: false, error: "Missing report_id in request body" });
    }

    const report = await prisma.report.findUnique({
      where: { report_id },
      select: { scraped_data_id: true },
    });

    if (!report?.scraped_data_id) {
      return res.status(404).json({ success: false, error: "scraped_data_id not found for report_id" });
    }

    // Get facebook_handle using scraped_data_id
    const websiteData = await prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report.scraped_data_id },
      select: { facebook_handle: true },
    });

    if (!websiteData?.facebook_handle) {
      return res.status(404).json({ success: false, error: "facebook_handle not found for scraped_data_id" });
    }
    const facebook_data = await getFacebookPostsFromScrapedData(websiteData.facebook_handle);

    const existingReport = await prisma.report.findUnique({
      where: { report_id },
      select: { dashboard2_data: true },
    });

    // ✅ Safe check before spreading
    let mergedDashboard2Data: any;

    if (existingReport?.dashboard2_data && typeof existingReport.dashboard2_data === "object" && !Array.isArray(existingReport.dashboard2_data)) {
      mergedDashboard2Data = {
        ...existingReport.dashboard2_data,

        ...facebook_data,
      };
    } else {
      mergedDashboard2Data = facebook_data;
    }

    const record = await prisma.report.upsert({
      where: { report_id },
      update: {
        website_id,
        dashboard2_data: mergedDashboard2Data,
      },
      create: {
        website_id,
        dashboard2_data: facebook_data,
      },
    });

    return res.json(facebook_data);
  } catch (error) {
    console.error("Error in getFacebookPostsHandler:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
