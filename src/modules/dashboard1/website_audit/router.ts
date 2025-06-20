import { Router } from "express";
import { handlePageSpeed } from "./controller";
import { asyncHandler } from "../../../utils/asyncHandler";
// import { generateLLMAuditReportforpagespeed } from "./llm-pagespeed";
// import { generateLLMAuditReportForBrokenLinks } from "./llm-broken_links";
const router = Router();

router.post("/check-pagespeed", asyncHandler(handlePageSpeed));

// router.post("/llm-pagespeed", asyncHandler(generateLLMAuditReportforpagespeed)); 
// router.post("/llm-broken_links", asyncHandler(generateLLMAuditReportForBrokenLinks)); 
export default router;
