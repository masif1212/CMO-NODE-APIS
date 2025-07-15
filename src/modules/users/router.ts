import express, { Request, Response, Router } from "express";
import { createUserHandler, getUserHandler, updateUserHandler } from "./controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createUserSchema, updateUserSchema } from "./schema";
import { asyncHandler } from "../../utils/asyncHandler";
import { adduserwebsite } from "./controller";
const router: Router = express.Router();

router.post("/", validateRequest(createUserSchema), createUserHandler);
router.get("/:id", asyncHandler(getUserHandler));
router.put("/:id", validateRequest(updateUserSchema), updateUserHandler);
router.post("/adduserwebsite", asyncHandler(adduserwebsite));

export default router;
