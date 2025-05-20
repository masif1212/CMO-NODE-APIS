import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { scrapeWebsitehandle } from "./controller";

const router = Router();

router.post("/scrape", asyncHandler(scrapeWebsitehandle));

export default router;
