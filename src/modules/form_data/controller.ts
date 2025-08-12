import { RequestHandler } from "express";
import { createBrandProfile,createuserType} from "./service";

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
    console.log("reqiremnts req.body",req.body)
    console.log("user:id", user_id, "website_id:", website_id)
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


export const handleusertype: RequestHandler = async (req, res) => {

  try {
    const {
      user_type,
      user_id,
    } = req.body;
    console.log("reqiremnts req.body",req.body)
    if (!user_id || !user_type) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, user_type",
      });
      return;  // important to stop execution
    }
    console.log("user:id", user_id) 
    console.log("user_type:", user_type)
    const result = await createuserType(user_id, user_type
    
      
    );
    console.log("result", result)

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error handling brand profile form:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};