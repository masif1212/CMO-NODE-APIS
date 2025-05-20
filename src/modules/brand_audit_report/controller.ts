// import { Request, Response, NextFunction } from "express";
// import { createBrandAudit } from "./brandAuditModule"; // Import the brand audit function

// // Controller function to handle brand audit requests
// export const handleWebsiteDataWithUpsert = async (req: Request, res: Response, next: NextFunction) => {
//   const { websiteUrl, userId } = req.body;

//   if (!websiteUrl || !userId) {
//     return res.status(400).json({
//       error: "Website URL and User ID are required.",
//     });
//   }

//   try {
//     const result = await createBrandAudit(websiteUrl, userId);
//     res.status(200).json({
//       message: result.message,
//       report: result.report,
//     });
//   } catch (error) {
//     console.error("❌ Error in /api/brand-audit:", error);
//     res.status(500).json({
//       error: "Failed to generate brand audit report"
//     });
//   }
// };
