// src/modules/brand_audit_report/router.ts
import express, { Request, Response, NextFunction } from "express"; // Correct imports
import { createBrandAudit } from "./brandAuditModule"; 

const router = express.Router();

router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { websiteUrl, userId } = req.body;

//   if (!websiteUrl || !userId) {
//     return res.status(400).json({
//       error: "Website URL and User ID are required.",
//     });
//   }

  try {
    const result = await createBrandAudit(websiteUrl, userId);
    res.status(200).json({
      message: "Brand audit generated successfully",
      report: result,
    });
  } catch (error) {
    console.error("❌ Error in /api/brand-audit:", error);
    res.status(500).json({
      error: "Failed to generate brand audit report",
    //   detail: error.message,  // Include error message in response
    });
  }
});

export default router;
