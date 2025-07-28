
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

import { Request, Response } from "express";
import { scrapeWebsite } from "./service";

export async function scrapeWebsitehandle(req: Request, res: Response) {
  const { user_id, website_id ,report_id} = req.body;

  if (!user_id || !website_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: user_id and website_id are required",
    });
  }

  try {
    console.log("Scraping started...");
    const data = await scrapeWebsite(user_id, website_id,report_id);

    const record = await prisma.report.upsert({
      where: {
        report_id: report_id, // this must be a UNIQUE constraint or @id in the model
      },
      update: {
        scraped_data_id: data.scraped_data_id
        // add any other fields you want to update
      },
      create: {
        website_id: website_id,
        scraped_data_id: data.scraped_data_id
        // add any other fields required for creation
      }
});

    console.log("Scraping compelted successfully");
    return res.status(200).json({
      success: true,
      report_id:record.report_id,
      website_id: data.website_id,
      logo_url: data.logo_url,
      statuscode: data.status_code,
      message:data.status_message,
      scraped_data_id:data.scraped_data_id
    });

  } catch (error) {
    console.error("Scrape handler error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while scraping website data",
    });
  }
}
