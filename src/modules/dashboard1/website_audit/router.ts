import { Router } from "express";
import { handlePageSpeed } from "./controller";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post("/check-pagespeed", asyncHandler(handlePageSpeed));

export default router;
