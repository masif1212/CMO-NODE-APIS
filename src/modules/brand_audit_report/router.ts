// // src/modules/brand_audit_report/router.ts
// import express, { Request, Response, NextFunction } from "express"; // Correct imports
// import { createBrandAudit } from "./brandAuditModule"; 

// const router = express.Router();

// router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   const { websiteUrl, userId } = req.body;

//   try {
//     const result = await createBrandAudit(websiteUrl, userId);
//     res.status(200).json({
//       message: "Brand audit generated successfully",
//       report: result,
//     });
//   } catch (error) {
//     console.error("❌ Error in /api/brand-audit:", error);
//     res.status(500).json({
//       error: "Failed to generate brand audit report",
//     //   detail: error.message,  // Include error message in response
//     });
//   }
// });

// export default router;

import { Router, Request, Response, NextFunction } from "express";
import { createBrandAudit } from "./brandAuditModule";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { websiteId , user_id} = req.body;

  if (!websiteId) {
    res.status(400).json({
      error: "websiteId is required.",
    });
    return;
  }

  try {
    const result = await createBrandAudit(websiteId,user_id);

    res.status(200).json({
      message: "Brand audit generated successfully",
      report: result,
    });
  } catch (error) {
    console.error("❌ Error in /api/brand-audit:", error);
    res.status(500).json({
      error: "Failed to generate brand audit report",
    });
  }
});

export default router;
