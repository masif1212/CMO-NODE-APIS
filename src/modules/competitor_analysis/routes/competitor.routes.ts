import { Router } from 'express';
import { CompetitorService } from '../services/ompetitor.service';

export const competitorRouter = Router();

competitorRouter.post('/', async (req, res, next) => {
     try {
          const { website_url,user_id } = req.body;
          const data = await CompetitorService.process(website_url);
          res.status(200).json({ competitors: data });
     } catch (e) {
          next(e);
     }
});
