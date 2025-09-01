import { Router } from "express";
import {
  handleBrandProfileForm,
  
} from "./controller";

const userRequirementsRouter = Router();

userRequirementsRouter.post("/brand-profile", handleBrandProfileForm);

export default userRequirementsRouter;
