import { Request, Response } from "express";
import { oAuth2Client } from "../../../config/googleClient";
import { getUserProperties, getAnalyticsSummary } from "./service";
import jwt from "jsonwebtoken";
import { saveUserRequirement } from "./service";
import { saveTrafficAnalysis } from "./service";
import { PrismaClient } from "@prisma/client";
import { generate_d1_recommendation ,generated1_strengthandIssue} from "../llm_dashboard1";

import * as cheerio from "cheerio";

const prisma = new PrismaClient();

export const startGoogleAuth = (req: Request, res: Response) => {
  console.log("Starting Google Auth");
  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
    "https://www.googleapis.com/auth/analytics.manage.users",
    "https://www.googleapis.com/auth/analytics.manage.users.readonly",
    "https://www.googleapis.com/auth/analytics",
    "profile",
    "email",
  ];
  console.log("login"); // Log the redirect URI for debugging
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(authUrl);
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  console.log("Handling Google Callback");
  if (!req.query.code) {
    console.error("No authorization code provided");
    return res.status(400).send("Authorization code not provided");
  }
  const code = req.query.code as string;
  console.log("Received Authorization Code:", code);
  console.log("Configured Redirect URI:", oAuth2Client); // Cannot access private property
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    // console.log("Tokens Received:", tokens.access_token, tokens.refresh_token);
    oAuth2Client.setCredentials(tokens);
    const idToken = tokens.id_token;
    const decodedToken = jwt.decode(idToken as string);
    const userId = (decodedToken as any).sub;
    req.session.user = {
      userId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      profile: decodedToken,
    };
    console.log("User Session Updated:", req.session.user);
    console.log("Session Updated:", req.session.user);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', data: ${JSON.stringify({ userId, profile: decodedToken })} }, '*');
        window.close();
      </script>
    `);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Token Exchange Error:", err.message, err.stack);
      res.send(`
        <script>
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Authentication failed: ${err.message}' }, '*');
          window.close();
        </script>
      `);
    } else {
      console.error("Token Exchange Error:", err);
      res.send(`
        <script>
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Authentication failed' }, '*');
          window.close();
        </script>
      `);
    }
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  if (req.session?.user) {
    console.log("Current User Session:", req.session.user);
    return res.status(200).json(req.session.user);
  }
  console.warn("No user session found");
  return res.status(401).json({ error: "Not authenticated" });
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err: any) => {
    if (err) return res.status(500).send("Logout failed");
    res.redirect("/");
  });
};

export const fetchProperties = async (req: Request, res: Response) => {
  // console.log("Session:", req.session); // Log session to check for the presence of `accessToken`
  try {
    if (!req.session?.user?.accessToken) {
      // console.log("No access token found");
      return res.status(401).json({ error: "No access token found" });
    }

    oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

    const properties = await getUserProperties(oAuth2Client);
    return res.status(200).json({ properties });
  } catch (err: any) {
    console.error("Property fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const fetchAnalyticsReport = async (req: Request, res: Response) => {
  const { property_id, website_id, user_id ,report_id} = req.body;
  console.log("Request Body:", req.body);

  if (!req.session?.user?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!property_id || !website_id || !user_id) {
    return res.status(400).json({ error: "Missing property_id, website_id or user_id" });
  }

  

  try {
    oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

    const summary = await getAnalyticsSummary(oAuth2Client, property_id);

    if (!summary || !summary.traffic || !summary.country || !summary.bouncePages) {
      return res.status(404).json({ message: "Analytics summary not found" });
    }
    const report = await prisma.report.findUnique({
      where: { report_id: report_id }, // You must have 'report_id' from req.body
      select: { scraped_data_id: true }
    });
    const savedTraffic = await saveTrafficAnalysis(summary); // should return traffic_analysis_id

    // Save user requirement inline here
    await saveUserRequirement({
      user_id,
     property_id,
     website_id,
      access_token: req.session.user.accessToken,
      profile: req.session.user.profile,
    });

   
    const scrapedMeta = await prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report?.scraped_data_id?? undefined },
      select: {
        page_title: true,
        meta_description: true,
        meta_keywords: true,
        og_title: true,
        og_description: true,
        og_image: true,
        ctr_loss_percent: true,
        raw_html: true,
        homepage_alt_text_coverage: true,
        status_message: true,
        status_code: true,
        ip_address: true,
        response_time_ms: true,
      },
    });
               
    const record = await prisma.report.upsert({
      where: {
        report_id: report_id, // this must be a UNIQUE constraint or @id in the model
      },
      update: {
        website_id: website_id, 
          traffic_analysis_id: savedTraffic.traffic_analysis_id,
          // dashboard1_Freedata: JSON.stringify(combine_data),
      },
      create: {
          website_id: website_id,
          traffic_analysis_id: savedTraffic.traffic_analysis_id,
          // dashboard1_Freedata: JSON.stringify(combine_data),
      }});

    let h1Text = "Not Found";

    if (scrapedMeta?.raw_html) {
      try {
        console.log("parsing HTML...");
        // console.log("Raw HTML Length:", scrapedMeta.raw_html);
        const $ = cheerio.load(scrapedMeta.raw_html);

        h1Text = $("h1").first().text().trim() || "Not Found";
        console.log("H1 Text:", h1Text);
      } catch (err) {
        if (err instanceof Error) {
          console.warn("Cheerio failed to parse HTML:", err.message);
        } else {
          console.warn("Cheerio failed to parse HTML:", err);
        }
        // Skips setting h1Text if error happens
      }
    } else {
      console.warn("Cheerio.load not available or raw_html missing");
    }

    const { raw_html, ...metaDataWithoutRawHtml } = scrapedMeta || {};
    
 const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

let update;
if (existing) {
  update = await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, trafficanaylsis: true }
  });
} else {
  update = await prisma.analysis_status.create({
    data: { report_id, website_id, trafficanaylsis: true ,user_id}
  });
}
    
    return res.status(200).json({
      message: "seo audit",
      traffic_anaylsis: savedTraffic,
      onpage_opptimization: {
        h1Text,
        metaDataWithoutRawHtml,
      },
      // raw_html: scrapedMeta?.raw_html,
    });
  } catch (error: any) {
    console.error("Analytics save error:", error);
    return res.status(500).json({
      error: "Failed to save analytics summary",
      detail: error.message,
    });
  }
};

export const dashboard1_Recommendation = async (req: Request, res: Response) => {
  // console.log("dashboard1_Recommendation called");
  const { website_id, user_id ,report_id} = req.body;

  console.log("Request Body:", req.body);
  // if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generate_d1_recommendation(website_id, user_id, report_id);
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


export const dashboard1_strengthandIssue = async (req: Request, res: Response) => {
  // console.log("dashboard1_Recommendation called");
  const { website_id, user_id ,report_id} = req.body;

  console.log("Request Body:", req.body);
  // if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!website_id || !user_id) return res.status(400).json({ error: "website_id or user_id" });

  try {
    const llm_response = await generated1_strengthandIssue(website_id, user_id, report_id);
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
