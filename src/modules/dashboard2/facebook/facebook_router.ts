import { Router } from "express";
import { getFacebookPostsHandler } from "./facebook_controller";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post("/", asyncHandler(getFacebookPostsHandler));

export default router;
