import { Router } from 'express';
import { getlinkedlinPostsHandler } from './linkedlin_controller';
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post('/',asyncHandler(getlinkedlinPostsHandler));

export default router;
