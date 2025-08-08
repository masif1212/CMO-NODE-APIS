import { Request, Response } from "express";

import { PrismaClient } from "@prisma/client";
import { generatesocialmediareport } from "./llm";


const prisma = new PrismaClient();

export const dashboard2_Recommendation = async (req: Request, res: Response) => {
  // console.log("dashboard1_Recommendation called");
  const { website_id, user_id ,report_id} = req.body;

  console.log("Request Body:", req.body);
  // if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generatesocialmediareport(website_id, user_id, report_id);
    // console.log("llm_res",llm_response)
    if (!llm_response) {
      return res.status(404).json({ message: "No recommendations found" });
    }
   

    return res.status(200).json(llm_response);
  } catch (error: any) {
    console.error("Analytics save error:", error);
    return res.status(500).json({ error: "Failed to save analytics summary", detail: error.message });
  }
};
