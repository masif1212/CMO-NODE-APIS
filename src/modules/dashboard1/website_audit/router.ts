import { Router } from "express";
import { handlePageSpeed } from "./controller";
import { asyncHandler } from "../../../utils/asyncHandler";
// import { generateLLMAuditReportforpagespeed } from "./llm-pagespeed";
// import { generateLLMAuditReportForBrokenLinks } from "./llm-broken_links";
const router = Router();

router.post("/check-pagespeed", asyncHandler(handlePageSpeed));

export default router;
