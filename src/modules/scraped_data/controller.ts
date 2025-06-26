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
    console.log("scrapping started")
    const data = await scrapeWebsite(user_id, website_url);
    // const website_id = data.website_id// Adjust property name as per ScrapeResult definition
    // console.log("validating schema markup...");
    //  const schemaResult: SchemaOutput = await validateComprehensiveSchema(website_url,website_id);
    // if (schemaResult) {
    //   console.log("Schema validation completed successfully:");
    
    return res.status(200).json({
      message: "Website scraped successfully",
      data,
    });
  } catch (error) {
    console.error("Scrape handler error:", error);
    return res.status(500).json({
      error: "An error occurred while scraping website data",
    });
  }
}
