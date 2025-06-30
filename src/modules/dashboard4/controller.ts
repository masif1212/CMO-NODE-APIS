import { Request, Response } from 'express';
import { CMORecommendationService } from './recommendation_by_cmo';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

interface CMORecommendationRequestBody {
  user_id: string;
  website_id: string;
}

export class CMORecommendationController {
  private recommendationService: CMORecommendationService;

  constructor(prisma: PrismaClient, openai: OpenAI, model: string) {
    this.recommendationService = new CMORecommendationService(prisma, openai, model);
  }

  public async generateRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, website_id } = req.body as CMORecommendationRequestBody;

      // Validate input
      if (!user_id || !website_id) {
        res.status(400).json({ error: 'Missing user_id or website_id' });
        return;
      }

      // Call the service to generate recommendation
      const result = await this.recommendationService.generateCMORecommendation({
        user_id,
        website_id,
      });

      // Send success response
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in generateRecommendation:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}