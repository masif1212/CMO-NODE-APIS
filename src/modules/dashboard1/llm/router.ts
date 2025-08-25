import { Router } from "express";
import { dashboard1_strengthandIssue, dashboard1_Recommendation , d1_burning_issues} from "./controller";
import { asyncHandler } from "../../../utils/asyncHandler";


const dashboardRouter1 = Router();

dashboardRouter1.post("/Recommendation", asyncHandler(dashboard1_Recommendation));
dashboardRouter1.post("/strengthandIssue", asyncHandler(dashboard1_strengthandIssue));
dashboardRouter1.post("/burningIssues", asyncHandler(d1_burning_issues));


export { dashboardRouter1 };