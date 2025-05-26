// import { Request, Response, NextFunction } from "express";
// import { createBrandAudit } from "./brandAuditModule"; // Updated function

// // Controller function to handle brand audit requests
// export const handleWebsiteDataWithUpsert = async (req: Request, res: Response, next: NextFunction) => {
//   const { websiteId,user_id} = req.body;

//   if (!websiteId) {
//     return res.status(400).json({
//       error: "Website URL and User ID are required.",
//     });
//   }

//   try {
//     const result = await createBrandAudit(websiteId,user_id); // Pass user_id to the function
//     res.status(200).json({
//       message: "Brand audit successfully generated and saved.",
//       brandAudit: result.brandAudit,  // returning the generated report
//     });
//   } catch (error) {
//     console.error("❌ Error in /api/brand-audit:", error);
//     res.status(500).json({
//       error: "Failed to generate brand audit report",
//     });
//   }
// };


import { Request, Response, NextFunction } from "express";
import { createBrandAudit } from "./brandAuditModule";
import { PrismaClient } from "@prisma/client"; // <-- import Prisma client

const prisma = new PrismaClient(); // <-- instantiate client

// Controller function to handle brand audit requests
export const handleWebsiteDataWithUpsert = async (req: Request, res: Response, next: NextFunction) => {
  const { website_id, user_id } = req.body;

  if (!website_id || !user_id) {
    return res.status(400).json({
      error: "Website ID and User ID are required.",
    });
  }

  try {
    // Step 1: Generate brand audit
    const result = await createBrandAudit(website_id, user_id);

    // Step 2: Mark brand audit as complete in analysis_status
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id: website_id,
        },
      },
      update: {
        brand_audit: true,
      },
      create: {
        user_id,
        website_id: website_id,
        brand_audit: true,
      },
    });

    // Step 3: Respond with success
    res.status(200).json({
      message: "Brand audit successfully generated and saved.",
      brandAudit: result.brandAudit,
    });
  } catch (error) {
    console.error("❌ Error in /api/brand-audit:", error);
    res.status(500).json({
      error: "Failed to generate brand audit report",
    });
  }
};
