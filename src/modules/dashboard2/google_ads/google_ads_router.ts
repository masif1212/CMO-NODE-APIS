import { Router } from 'express';
import { getgoogleAdsHandler } from './google_ads_controller';
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post('/', asyncHandler(getgoogleAdsHandler));

export default router;
