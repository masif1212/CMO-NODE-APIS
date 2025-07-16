import { Request, Response } from "express";
import * as UserService from "./service";
import { CreateUserDto, UpdateUserDto} from "./schema";
import { add_userwebsite } from "./service";

export const createUserHandler = async (req: Request, res: Response) => {
  const input: CreateUserDto = req.body;
  const user = await UserService.createUser(input);
  res.status(200).json({ success: true, data: user });
};

export const getUserHandler = async (req: Request, res: Response) => {
  const userId = req.params.id;
  return res.status(200).json({ success: true, userId });
};

export const updateUserHandler = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const update: UpdateUserDto = req.body;
  const user = await UserService.updateUser(userId, update);
  res.status(200).json({ success: true, data: user });
};

export const adduserwebsite = async (req: Request, res: Response) => {
  const user_id = req.body.user_id;
  const website_url= req.body.website_url;
  const data = await add_userwebsite(user_id, website_url);
  console.log("User website added:", data);
  res.status(200).json(data );
};
