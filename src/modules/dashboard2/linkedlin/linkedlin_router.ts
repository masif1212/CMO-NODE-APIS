import { Router } from 'express';
import { getLinkedinPostsHandler } from './linkedlin_controller';
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post('/',asyncHandler(getLinkedinPostsHandler));

export default router;
