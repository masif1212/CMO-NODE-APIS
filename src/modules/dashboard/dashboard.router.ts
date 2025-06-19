// dashboard.router.ts
import { Router } from "express";
import { getUserDashboard ,getWebsiteDetailedAnalysis} from "./dashboard.controller"; // ✅ Correct named import

const router = Router();
router.get("/main_dashboard", (req, res, next) => {
  getUserDashboard(req, res).catch(next);
});

router.get("/DetailedAnalysis", (req, res, next) => {
  getWebsiteDetailedAnalysis(req, res).catch(next); });// ✅ Correct named import
export default router;