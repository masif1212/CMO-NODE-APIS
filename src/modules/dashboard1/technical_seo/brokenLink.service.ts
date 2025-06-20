import { PrismaClient, Prisma } from "@prisma/client";
import { BrokenLinkResult } from "../../../types/express";

const prisma = new PrismaClient();

export const saveBrokenLinkAnalysis = async (
  user_id: string,
  website_id: string,
  brokenLinks: BrokenLinkResult[],
  totalBroken: number
) => {
  // Step 1: Check website belongs to user
  const userWebsite = await prisma.user_websites.findFirst({
    where: { user_id, website_id },
  });
  if (!userWebsite) {
    throw new Error("Website does not belong to the user.");
  }

  // Step 2: Get all website IDs owned by user
  const userWebsites = await prisma.user_websites.findMany({
    where: { user_id },
    select: { website_id: true },
  });
  const websiteIds = userWebsites.map(w => w.website_id);

  // Step 3: Find latest analysis for any of the user's websites
  const latest = await prisma.brand_website_analysis.findFirst({
    where: { website_id: { in: websiteIds } },
    orderBy: { created_at: "desc" },
  });

  if (latest) {
    // Update existing analysis
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

  // Step 4: Create new analysis
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

