import { Router } from "express";
import { getUserdata,addOrUpdateAnalysisService,Deactivateuser} from "./admin_service";

const router = Router();

// GET /api/main_dashboard/overview
router.get("/data", (req, res, next) => {
  getUserdata(req, res).catch(next);
});

router.post("/subscription_plans", (req, res, next) => {
  addOrUpdateAnalysisService(req, res).catch(next);
});

router.post("/Deactivateuser", (req, res, next) => {
  Deactivateuser(req, res).catch(next);
});

export default router;