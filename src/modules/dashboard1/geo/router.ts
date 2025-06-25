// src/modules/legal_ai/router.ts
import express from 'express';
import { getLegalAIBrandsController } from './controller';

const geo_llm = express.Router();


geo_llm.post('/', (req, res, next) => {
  Promise.resolve(getLegalAIBrandsController(req, res))
	.catch(next);
});

export default geo_llm;
