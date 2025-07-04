
import { Request, Response } from "express";
import { scrapeWebsite } from "./service";

export async function scrapeWebsitehandle(req: Request, res: Response) {
  const { user_id, website_url } = req.body;

  if (!user_id || !website_url) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: user_id and website_url are required",
    });
  }

  try {
    console.log("Scraping started...");
    const data = await scrapeWebsite(user_id, website_url);

    if (!data.success) {
      const status = data.status_code === 429 ? 429
                   : data.status_code === 400 ? 400
                   : data.status_code || 500;

      return res.status(status).json({
        success: false,
        error: data.error || "Scraping failed",
      });
    }

    return res.status(200).json({
      success: true,
      website_id: data.website_id,
      logo_url: data.logo_url,
    });

  } catch (error) {
    console.error("Scrape handler error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while scraping website data",
    });
  }
}
