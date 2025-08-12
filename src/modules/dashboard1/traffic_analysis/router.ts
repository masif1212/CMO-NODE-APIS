import { Router } from "express";
import { fetchProperties, dashboard1_strengthandIssue, fetchAnalyticsReport, startGoogleAuth, handleGoogleCallback, getCurrentUser, logout, dashboard1_Recommendation } from "./controller";
import { asyncHandler } from "../../../utils/asyncHandler";
const router = Router();

router.get("/oauth/google", startGoogleAuth);
router.get("/oauth/google/callback", asyncHandler(handleGoogleCallback));
router.get("/me", asyncHandler(getCurrentUser));
router.get("/logout", logout);
router.get("/property", asyncHandler(fetchProperties));
router.post("/property", asyncHandler(fetchAnalyticsReport));
export default router;

const dashboardRouter1 = Router();

dashboardRouter1.post("/Recommendation", asyncHandler(dashboard1_Recommendation));
dashboardRouter1.post("/strengthandIssue", asyncHandler(dashboard1_strengthandIssue));

export { dashboardRouter1 };