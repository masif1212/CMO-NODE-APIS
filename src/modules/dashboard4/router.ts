// src/modules/dashboard4/router.ts
import { Router } from "express";
import { recommendation_by_cmo } from "./controller";

const router = Router();
router.post("/", recommendation_by_cmo);

export default router; //   make sure you're exporting the router
