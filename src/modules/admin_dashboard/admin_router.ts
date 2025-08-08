import { Router } from "express";
import { getUserdata} from "./admin_service";

const router = Router();

// GET /api/main_dashboard/overview
router.get("/data", (req, res, next) => {
  getUserdata(req, res).catch(next);
});


export default router;