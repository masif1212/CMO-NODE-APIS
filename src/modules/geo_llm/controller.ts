// src/modules/legal_ai/controller.ts
import { Request, Response } from 'express';
import { fetchLegalAIBrands } from './service';

export const getLegalAIBrandsController = async (req: Request, res: Response) => {
  try {
    const { user_id, website_id } = req.body;

    if (!user_id || !website_id) {
      return res.status(400).json({ message: 'user_id and website_id are required' });
    }

    const result = await fetchLegalAIBrands(user_id, website_id);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
