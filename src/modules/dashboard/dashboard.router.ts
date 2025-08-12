import { Router } from "express";
import { getUserDashboard, getWebsiteDetailedAnalysis, getaudit } from "./dashboard.controller";

const router = Router();

// GET /api/main_dashboard/overview
router.get("/overview", (req, res, next) => {
  getUserDashboard(req, res).catch(next);
});

// GET /api/main_dashboard/detailed
router.get("/detailed", (req, res, next) => {
  getWebsiteDetailedAnalysis(req, res).catch(next);
});


router.get("/reports", (req, res, next) => {
  getaudit(req, res).catch(next);
});

export default router;