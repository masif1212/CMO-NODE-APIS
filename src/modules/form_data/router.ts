import { Router } from "express";
import {
  handleBrandProfileForm,
  handleusertype
} from "./controller";

const userRequirementsRouter = Router();

userRequirementsRouter.post("/brand-profile", handleBrandProfileForm);
userRequirementsRouter.post("/user_type", handleusertype);

export default userRequirementsRouter;
