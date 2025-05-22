import { Request, Response, NextFunction } from "express";
import { createBrandAudit } from "./brandAuditModule"; // Updated function

// Controller function to handle brand audit requests
export const handleWebsiteDataWithUpsert = async (req: Request, res: Response, next: NextFunction) => {
  const { websiteId,user_id} = req.body;

  if (!websiteId) {
    return res.status(400).json({
      error: "Website URL and User ID are required.",
    });
  }

  try {
    const result = await createBrandAudit(websiteId,user_id); // Pass user_id to the function
    res.status(200).json({
      message: "Brand audit successfully generated and saved.",
      brandAudit: result.brandAudit,  // returning the generated report
    });
  } catch (error) {
    console.error("❌ Error in /api/brand-audit:", error);
    res.status(500).json({
      error: "Failed to generate brand audit report",
    });
  }
};
