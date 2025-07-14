import { Router } from 'express';
import { CompetitorService } from './competitor.service';

export const competitorRouter = Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

competitorRouter.post('/brandprofile', async (req, res, next) => {
  try {
    const { user_id,website_id  } = req.body;
    console.log("competitors identification started.. ")
    const data = await CompetitorService.brandprofile(user_id,website_id);
   
    console.log("competitors identification complete ")
    res.status(200).json({ competitors: data });
  } catch (e) {
    next(e);
  }
});


competitorRouter.post('/seo_audit', async (req, res, next) => {
  try {
    const { user_id,website_id  } = req.body;
    const data = await CompetitorService.seo_audit(user_id,website_id);
   
    console.log("competitors seo_audit complete ")
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
});


competitorRouter.post('/website_audit', async (req, res, next) => {
  try {
    const { user_id,website_id  } = req.body;
    const data = await CompetitorService.website_audit(user_id,website_id);
    
    console.log("competitors website_audit complete ")
    res.status(200).json({ competitors: data });
  } catch (e) {
    next(e);
  }
});


competitorRouter.post('/recommendations', async (req, res, next) => {
  try {
    const { user_id,website_id  } = req.body;
    if (!website_id) throw new Error("website_id is required");

    const data = await CompetitorService.getComparisonRecommendations(website_id);
   
    console.log("competitors recommendations complete ")
    res.status(200).json({ recommendation_by_mo_dashboard3: data });
  } catch (e) {
    next(e);
  }
});
