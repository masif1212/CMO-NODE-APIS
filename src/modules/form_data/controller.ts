import { RequestHandler } from "express";
import { createBrandProfile} from "./service";

// Handles POST /brand-profile

export const handleBrandProfileForm: RequestHandler = async (req, res) => {
  try {
    const {
      brand_offering,
      usp,
      industry,
      location,
      target_audience,
      competitor_urls,
      user_id,
      website_id,
    } = req.body;

    if (!user_id || !website_id) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, website_id",
      });
      return;  // important to stop execution
    }

    const result = await createBrandProfile(user_id, website_id, {
      brand_offering,
      usp,
      industry,
      location,
      target_audience,
      competitor_urls
      
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error handling brand profile form:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};


// Handles POST /update-user-type


