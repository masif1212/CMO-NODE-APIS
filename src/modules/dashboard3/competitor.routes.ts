import { Router } from 'express';
import { CompetitorService } from './competitor.service';

export const competitorRouter = Router();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

competitorRouter.post('/brandprofile', async (req, res, next) => {
  try {
    const { user_id,website_id,report_id } = req.body;
    console.log("competitors identification started.. ")
    const data = await CompetitorService.brandprofile(user_id,website_id,report_id);
    
    console.log("competitors identification complete ")
    
    res.status(200).json({ competitors: data });
  } catch (e) {
    next(e);
  }
});


competitorRouter.post('/seo_audit', async (req, res, next) => {
  try {
    const { user_id,website_id,report_id  } = req.body;
    const data = await CompetitorService.seo_audit(user_id,website_id,report_id);
   
    console.log("competitors seo_audit complete ")
    res.status(200).json(data);
  } catch (e) {
    next(e);
  }
});


competitorRouter.post('/website_audit', async (req, res, next) => {
  try {
    const { user_id,website_id,report_id  } = req.body;
    const data = await CompetitorService.website_audit(user_id,website_id,report_id);
    
    console.log("competitors website_audit complete ")
     const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

let update;
if (existing) {
  update = await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, competitors_identification: true }
  });
} else {
  update = await prisma.analysis_status.create({
    data: { report_id, website_id, competitors_identification: true ,user_id}
  });
}
    res.status(200).json({ competitors: data });
  } catch (e) {
    next(e);
  }
});

competitorRouter.post('/social_media', async (req, res, next) => {
  try {
    console.log(" competitors social media anyalsis started ")
    const { user_id,website_id,report_id  } = req.body;
    const data = await CompetitorService.social_media(user_id,website_id,report_id);
    
    console.log("competitors social media  complete ")
     const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

let update;
if (existing) {
  update = await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, competitors_identification: true }
  });
} else {
  update = await prisma.analysis_status.create({
    data: { report_id, website_id, competitors_identification: true ,user_id}
  });
}
    res.status(200).json({ competitors: data });
  } catch (e) {
    next(e);
  }
});

competitorRouter.post('/recommendations', async (req, res, next) => {
  try {
    const { user_id,website_id,report_id  } = req.body;
    if (!website_id) throw new Error("website_id is required");

    const data = await CompetitorService.getComparisonRecommendations(website_id,report_id);
   
    console.log("competitors recommendations complete ")
     const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

let update;
if (existing) {
  update = await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, recommendationbymo3: true }
  });
} else {
  update = await prisma.analysis_status.create({
    data: { report_id, website_id, recommendationbymo3: true ,user_id}
  });
}
    res.status(200).json({ recommendation_by_mo_dashboard3: data });
  } catch (e) {
    next(e);
  }
});
