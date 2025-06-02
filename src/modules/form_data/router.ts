import { Router } from "express";
import {
  handleBrandProfileForm,
  handleUserTypeUpdate,
} from "./controller";

const userRequirementsRouter = Router();

userRequirementsRouter.post("/brand-profile", handleBrandProfileForm);
userRequirementsRouter.post("/user-type", handleUserTypeUpdate);

export default userRequirementsRouter;
