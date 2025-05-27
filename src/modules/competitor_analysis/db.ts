import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const db = {
  getWebsiteWithId: (website_id: string) =>
    prisma.website_scraped_data.findFirst({ where: { website_id }, include: { competitor_details: true } }),

  createUserWebsite: (website_id: string, user_id: string, website_url: string) =>
    prisma.user_websites.create({ data: { website_id, user_id, website_url } }),

  upsertWebsiteScrapedData: (websiteIdToUse: string, scraped: any) =>
    prisma.website_scraped_data.upsert({
      where: { website_id: websiteIdToUse },
      update: { ...scraped, updated_at: new Date() },
      create: { website_id: websiteIdToUse, ...scraped },
      include: { competitor_details: true },
    }),

  updateAiResponse: (website_id: string, aiResponse: string) =>
    prisma.website_scraped_data.update({ where: { website_id }, data: { ai_response: aiResponse } }),

  getUserRequirements: (website_id: string) =>
    prisma.user_requirements.findFirst({ where: { website_id } }),

  saveCompetitor: (competitor_id: string, website_id: string, data: any) =>
    prisma.competitor_scraped_data.upsert({
      where: { competitor_id },
      update: { website_url: data.website_url, page_title: data.page_title, meta_description: data.meta_description, updated_at: new Date() },
      create: { competitor_id, website_id, ...data },
    }),

  createCompetitorDetails: (competitor_id: string, website_id: string, comp: any) =>
    prisma.competitor_details.create({
      data: {
        competitor_id,
        website_id,
        name: comp.name,
        website_url: comp.website_url,
        industry: comp.industry,
        region: comp.region,
        target_audience: comp.target_audience,
        primary_offering: comp.primary_offering,
        usp: comp.usp,
      },
    }),
};
