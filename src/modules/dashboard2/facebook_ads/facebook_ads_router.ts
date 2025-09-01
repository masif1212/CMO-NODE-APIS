import { Router } from 'express';
import { getfacebookAdsHandler } from './facebook_ads_controller';
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post('/',asyncHandler(getfacebookAdsHandler));

export default router;
