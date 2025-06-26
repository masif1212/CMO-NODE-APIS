import { Router } from 'express';
import { CompetitorService } from './competitor.service';

export const competitorRouter = Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

competitorRouter.post('/identification', async (req, res, next) => {
     try {
          const { website_id,user_id } = req.body;
          const data = await CompetitorService.process(website_id,user_id);
           await prisma.analysis_status.upsert({
          where: {
            user_id_website_id: { user_id, website_id },
          },
          update: { competitor_details: 'true' },
          create: { user_id, website_id, competitor_details: 'true' },
        });

          res.status(200).json({ competitors: data });
     } catch (e) {
          next(e);
     }
});


competitorRouter.post('/recommendations', async (req, res, next) => {
  try {
    const { website_id ,user_id} = req.body;
    if (!website_id) throw new Error("website_id is required");

    const data = await CompetitorService.getComparisonRecommendations(website_id);
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        recommendation_by_mo3: "true",
      },
      create: {
        user_id,
        website_id,
        recommendation_by_mo3: "true",
      },
    });
    res.status(200).json({ recommendations: data });
  } catch (e) {
    next(e);
  }
});
