import { Router } from "express";
import { fetchProperties, fetchAnalyticsReport, startGoogleAuth, handleGoogleCallback, getCurrentUser, logout ,dashborad1_Recommendation} from "./controller";
import { asyncHandler } from "../../utils/asyncHandler";
// import { generateLLMTrafficReport } from "./llm_traffic_anaylsis";
const router = Router();

router.get("/oauth/google", startGoogleAuth);
router.get("/oauth/google/callback", asyncHandler(handleGoogleCallback));
router.get("/me", asyncHandler(getCurrentUser));
router.get("/logout", logout);
router.get("/property", asyncHandler(fetchProperties));
router.post("/property", asyncHandler(fetchAnalyticsReport));
router.post("/property/dashborad1_Recommendation", asyncHandler(dashborad1_Recommendation));
export default router;
