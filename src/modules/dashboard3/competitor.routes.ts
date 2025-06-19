import { Router } from 'express';
import { CompetitorService } from './competitor.service';

export const competitorRouter = Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

competitorRouter.post('/identification', async (req, res, next) => {
     try {
          const { website_url,user_id } = req.body;
          const data = await CompetitorService.process(website_url,user_id);
 

          res.status(200).json({ competitors: data });
     } catch (e) {
          next(e);
     }
});


competitorRouter.post('/recommendations', async (req, res, next) => {
  try {
    const { website_id } = req.body;
    if (!website_id) throw new Error("website_id is required");

    const data = await CompetitorService.getComparisonRecommendations(website_id);
    res.status(200).json({ recommendations: data });
  } catch (e) {
    next(e);
  }
});
