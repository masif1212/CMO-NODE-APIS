import { PrismaClient, Prisma } from "@prisma/client";
import { BrokenLinkResult } from "../../types/express";

const prisma = new PrismaClient();

export const saveBrokenLinkAnalysis = async (website_id: string, brokenLinks: BrokenLinkResult[], totalBroken: number) => {
  // Step 1: Get latest analysis for the given website_id
  const latest = await prisma.brand_website_analysis.findFirst({
    where: { website_id },
    orderBy: { created_at: "desc" }, // Most recent
  });

  // Step 2: If record exists, update it
  if (latest) {
    return prisma.brand_website_analysis.update({
      where: { website_analysis_id: latest.website_analysis_id },
      data: {
        total_broken_links: totalBroken,
        broken_links: brokenLinks as unknown as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      select: {
        website_analysis_id: true,
        website_id: true,
        total_broken_links: true,
        broken_links: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  // Step 3: If no record exists, create a new one
  return prisma.brand_website_analysis.create({
    data: {
      website_id,
      total_broken_links: totalBroken,
      broken_links: brokenLinks as unknown as Prisma.InputJsonValue,
    },
    select: {
      website_analysis_id: true,
      website_id: true,
      total_broken_links: true,
      broken_links: true,
      created_at: true,
    },
  });
};
