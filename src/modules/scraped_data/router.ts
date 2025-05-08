import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { scrapeWebsiteHandler } from "./controller";

const router = Router();

router.post("/scrape", asyncHandler(scrapeWebsiteHandler));

export default router;
