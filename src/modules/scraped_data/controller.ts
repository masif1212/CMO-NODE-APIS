import { Request, Response } from "express";
import { scrapeWebsite } from "./service";

export async function scrapeWebsitehandle(req: Request, res: Response) {
  const { user_id, website_url } = req.body;

  if (!user_id || !website_url) {
    return res.status(400).json({
      error: "Missing required fields: user_id and website_url are required",
    });
  }

  try {
    const data = await scrapeWebsite(user_id, website_url);
    return res.status(200).json({
      message: "Website scraped successfully",
      data: data,
    });
  } catch (error) {
    console.error("Scrape handler error:", error);
    return res.status(500).json({
      error: "An error occurred while scraping website data",
    });
  }
}
