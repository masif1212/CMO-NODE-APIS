import { Router, Request, Response, NextFunction } from "express";
import { createBrandAudit } from "./recommendation_by_cmo";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
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
