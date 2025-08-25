import { Request, Response } from "express";
import { generate_d1_recommendation, generated1_strengthandIssue ,generate_d1_burning_issues} from "../llm/llm_dashboard1";


export const dashboard1_Recommendation = async (req: Request, res: Response) => {
  const { website_id, user_id, report_id } = req.body;

  console.log("Request Body:", req.body);
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generate_d1_recommendation(website_id, user_id, report_id);
    if (!llm_response) {
      return res.status(404).json({ message: "No recommendations found" });
    }


    return res.status(200).json(llm_response);
  } catch (error: any) {
    console.error("failed to generate recommendationbymo1:", error);
    return res.status(500).json({ error: "failed to generate recommendationbymo1:", detail: error });
  }
};



export const d1_burning_issues = async (req: Request, res: Response) => {
  const { website_id, user_id, report_id } = req.body;

  console.log("Request Body:", req.body);
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generate_d1_burning_issues(website_id, user_id, report_id);
    if (!llm_response) {
      return res.status(404).json({ message: "No burning issues" });
    }


    return res.status(200).json(llm_response);
  } catch (error: any) {
    console.error("failed to generate burining issues: ", error);
    return res.status(500).json({ error: "failed to generated burining issues: ", detail: error });
  }
};

export const dashboard1_strengthandIssue = async (req: Request, res: Response) => {
  const { website_id, user_id, report_id } = req.body;

  console.log("Request Body:", req.body);
  // if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generated1_strengthandIssue(website_id, user_id, report_id);
    if (!llm_response) {
      return res.status(404).json({ message: "No recommendations found" });
    }


    return res.status(200).json(llm_response);
  } catch (error: any) {
    console.error("Analytics save error:", error);
    return res.status(500).json({ error: "Failed to save analytics summary", detail: error.message });
  }
};
