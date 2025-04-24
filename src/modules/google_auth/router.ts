import { Router } from "express";
import { fetchProperties, fetchAnalyticsReport, startGoogleAuth, handleGoogleCallback, getCurrentUser, logout } from "./controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/oauth/google", startGoogleAuth);
router.get("/oauth/google/callback", asyncHandler(handleGoogleCallback));
router.get("/me", asyncHandler(getCurrentUser));
router.get("/logout", logout);
router.get("/property", asyncHandler(fetchProperties));
router.post("/property", asyncHandler(fetchAnalyticsReport));

export default router;
