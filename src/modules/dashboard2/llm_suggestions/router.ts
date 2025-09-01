import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { dashboard2_Recommendation } from "./controller";
const router = Router();

// router.post("/property/dashboard1_Recommendation", asyncHandler(dashboard1_Recommendation));
export default router;

const dashboardRouter2 = Router();

dashboardRouter2.post("/", asyncHandler(dashboard2_Recommendation));
export { dashboardRouter2 };