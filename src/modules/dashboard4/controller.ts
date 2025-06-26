
import { generateCMOReport } from "./recommendation_by_cmo";
import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const recommendation_by_cmo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { website_id, user_id } = req.body;

  if (!website_id || !user_id) {
    res.status(400).json({
      error: "Website ID and User ID are required.",
    });
    return;
  }
  console.log("Received request to generate CMO report for website_id:", website_id, "and user_id:", user_id);
  try {
    
    let report;
    try {
      report = await generateCMOReport(website_id);
      console.log("CMO Report Generated:");
    } catch (error) {
      console.error("Error generating report:", error);
      throw new Error("Failed to generate CMO report");
    }

  await prisma.analysis_status.upsert({
    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    update: {
      recommendation_by_cmo: "true",
    },
    create: {
      user_id,
      website_id,
      recommendation_by_cmo: "true",
    },
  });

  // Step 3: Respond with success
  res.status(200).json({
    message: "Report generated successfully",
    report,
  });
  } catch (error) {
    console.error("❌ Error in /api/recommendationbycmo", error);
    res.status(500).json({
      error: "Failed to generate cmo report",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
};
