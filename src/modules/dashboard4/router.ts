import { Router } from 'express';
import { CMORecommendationController } from './controller';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || 'gpt-4o';
const controller = new CMORecommendationController(prisma, openai, model);

const router = Router();

router.post('/', controller.generateRecommendation.bind(controller));

export default router;