import { Router } from "express";
import express, { Request, Response } from 'express';
import { FacebookService } from './facebook.service';

import { getfacebookdata } from "./facebook.controller";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = express.Router();

router.get('/login', (req: Request, res: Response) => {
  const url = FacebookService.getAuthUrl();
  res.redirect(url);
});
router.post("/fetchfacebook", asyncHandler(getfacebookdata));

export default router;
