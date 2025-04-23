import { Router } from "express";
import { handlePageSpeed, handleBrokenLinks } from "./controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/check-pagespeed", asyncHandler(handlePageSpeed));
router.post("/check-brokenlinks", asyncHandler(handleBrokenLinks));

export default router;
