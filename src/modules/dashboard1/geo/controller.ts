// src/modules/legal_ai/controller.ts
import { Request, Response } from 'express';
import { fetchBrands } from './service';

export const getLegalAIBrandsController = async (req: Request, res: Response) => {
  try {
    const { user_id, website_id } = req.body;
    // console.log('Received request with user_id:', user_id, 'and website_id:', website_id);
    if (!user_id || !website_id) {
      return res.status(400).json({ message: 'user_id and website_id are required' });
    }

    const result = await fetchBrands(user_id, website_id);
    if (result) {
      console.log('Fetched brands successfully');
    }
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Internal server error' }); 
  }
};
