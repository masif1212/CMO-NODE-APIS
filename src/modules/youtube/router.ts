import express, { Router } from "express";
import { handleYoutubeStats } from "./controller";

const router: Router = express.Router();

router.post("/summary", handleYoutubeStats);

export default router;