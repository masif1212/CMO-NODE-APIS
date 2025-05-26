import { Router } from 'express';
import { CompetitorService } from './ompetitor.service';

export const competitorRouter = Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

competitorRouter.post('/', async (req, res, next) => {
     try {
          const { website_url,user_id,website_id } = req.body;
          const data = await CompetitorService.process(website_url,user_id,website_id);
           // Step 2: Mark brand audit as complete in analysis_status
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id: website_id,
        },
      },
      update: {
        competitor_analysis: true,
      },
      create: {
        user_id,
        website_id: website_id,
        competitor_analysis: true,
      },
    });

          res.status(200).json({ competitors: data });
     } catch (e) {
          next(e);
     }
});
