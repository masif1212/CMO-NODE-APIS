import { Request, Response } from "express";
import { oAuth2Client } from "../../config/googleClient";
import { getUserProperties, getAnalyticsSummary } from "./service";
import jwt from "jsonwebtoken";
import { saveUserRequirement } from "./service";
import { saveTrafficAnalysis } from "./service";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startGoogleAuth = (req: Request, res: Response) => {
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

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(authUrl);
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) return res.status(400).send("Missing authorization code");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
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

    // Send HTML response that will close the popup and notify the parent window
    res.send(`
      <script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', data: ${JSON.stringify({ userId, profile: decodedToken })} }, '*');
        window.close();
      </script>
    `);
  } catch (err) {
    console.error("OAuth2 callback error:", err);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Authentication failed' }, '*');
        window.close();
      </script>
    `);
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  if (req.session?.user) {
    return res.status(200).json(req.session.user);
  }
  return res.status(401).json({ error: "Not authenticated" });
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err: any) => {
    if (err) return res.status(500).send("Logout failed");
    res.redirect("/");
  });
};

export const fetchProperties = async (req: Request, res: Response) => {
  console.log("Session:", req.session); // Log session to check for the presence of `accessToken`
  try {
    if (!req.session?.user?.accessToken) {
      console.log("No access token found");
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
  
// export const fetchAnalyticsReport = async (req: Request, res: Response) => {
//   const { property_id, website_id, user_id } = req.body;

//   if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
//   if (!property_id || !website_id) return res.status(400).json({ error: "Missing property_id or website_id" });

//   try {
//     const { getAnalyticsSummary } = await import("./service");
//     const { oAuth2Client } = await import("../../config/googleClient");
//     oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

//     // Fetch the analytics summary
//     const summary = await getAnalyticsSummary(oAuth2Client, property_id);
//     console.log("Analytics summary:", summary);

//     // Check if the summary is empty or doesn't contain meaningful data
//     if (!summary || Object.keys(summary).length === 0 || !summary.traffic || !summary.country || !summary.bouncePages) {
//       return res.status(404).json({ message: "Analytics summary not found" });
//     }

//     // Save the analytics data if it is valid
//     const saved = await saveTrafficAnalysis(website_id, summary);
//     return res.status(200).json({ message: "Analytics summary saved", data: saved });
//   } catch (error: any)
//    {
//     console.error("Analytics save error:", error);
//     return res.status(500).json({ error: "Failed to save analytics summary", detail: error.message });
//   }
// };


export const fetchAnalyticsReport = async (req: Request, res: Response) => {
  const { property_id, website_id, user_id } = req.body;

  if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!property_id || !website_id || !user_id) return res.status(400).json({ error: "Missing property_id, website_id or user_id" });

  if (!property_id || !website_id) return res.status(400).json({ error: "Missing property_id or website_id" });
console.log(website_id,"website id ")
  try {
    oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

    const summary = await getAnalyticsSummary(oAuth2Client, property_id);

    if (!summary || !summary.traffic || !summary.country || !summary.bouncePages) {
      return res.status(404).json({ message: "Analytics summary not found" });
    }

    // Save analytics summary
    const savedSummary = await saveTrafficAnalysis(website_id, summary);

    // Save user requirement inline here
    await saveUserRequirement({
      user_id,
      website_id,
      property_id,
      access_token: req.session.user.accessToken,
      profile: req.session.user.profile,
    });
    
        // Step 2: Mark brand audit as complete in analysis_status
        await prisma.analysis_status.upsert({
          where: {
            user_id_website_id: {
              user_id,
              website_id: website_id,
            },
          },
          update: {
            traffic_analysis: true,
          },
          create: {
            user_id,
            website_id: website_id,
            traffic_analysis: true,
          },
        });
    return res.status(200).json({ message: "Analytics summary and user requirement saved", data: savedSummary });
    // Save the analytics data if it is valid
    const saved = await saveTrafficAnalysis(website_id, summary);
    return res.status(200).json({ message: "Analytics summary saved", data: saved });
  } catch (error: any) {
    console.error("Analytics save error:", error);
    return res.status(500).json({ error: "Failed to save analytics summary", detail: error.message });
  }
};
