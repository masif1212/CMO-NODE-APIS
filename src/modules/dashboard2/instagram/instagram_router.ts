import { Router } from 'express';
import { getInstagramPostsHandler } from './instagram_controller';
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post('/', asyncHandler(getInstagramPostsHandler));

export default router;
