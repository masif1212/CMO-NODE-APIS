import { Router } from "express";
import { handleBrokenLinks } from "./tech_controller";
import { asyncHandler } from "../../../utils/asyncHandler";
// import { generateLLMAuditReportforpagespeed } from "./llm-pagespeed";
// import { generateLLMAuditReportForBrokenLinks } from "./llm-broken_links";
const router = Router();

router.post("/technical_seo", asyncHandler(handleBrokenLinks));

export default router;
