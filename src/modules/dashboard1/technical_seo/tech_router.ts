import { Router } from "express";
import { technical_seo } from "./tech_controller";
import { asyncHandler } from "../../../utils/asyncHandler";
const router = Router();

router.post("/", asyncHandler(technical_seo));

export default router;
