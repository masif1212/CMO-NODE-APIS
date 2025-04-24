import { Request, Response } from "express";
import { oAuth2Client } from "../../config/googleClient";
import { getUserProperties, getAnalyticsSummary } from "./service";
import jwt from "jsonwebtoken";
import { SaveTrafficSummarySchema } from "./schema";
import { saveTrafficAnalysis } from "./service";
import { ensureUserWebsiteExists } from "../pagespeed/service";

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

    return res.redirect("/ga/property");
  } catch (err) {
    console.error("OAuth2 callback error:", err);
    return res.status(500).send("Authentication failed");
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
  try {
    if (!req.session?.user?.accessToken) return res.redirect("/");
    oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

    const properties = await getUserProperties(oAuth2Client);
    return res.status(200).json({ properties });
  } catch (err: any) {
    console.error("Property fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const fetchAnalyticsReport = async (req: Request, res: Response) => {
  const { property_id, url, user_id } = req.body;
  const website = await ensureUserWebsiteExists(url, user_id);
  if (!req.session?.user?.accessToken) return res.status(401).json({ error: "Unauthorized" });
  if (!property_id || !website?.website_id) return res.status(400).json({ error: "Missing property_id or website_id" });

  try {
    const { getAnalyticsSummary } = await import("./service");
    const { oAuth2Client } = await import("../../config/googleClient");
    oAuth2Client.setCredentials({ access_token: req.session.user.accessToken });

    const summary = await getAnalyticsSummary(oAuth2Client, property_id);
    const saved = await saveTrafficAnalysis(website.website_id, summary);

    return res.status(200).json({ message: "Analytics summary saved", data: saved });
  } catch (error: any) {
    console.error("Analytics save error:", error);
    return res.status(500).json({ error: "Failed to save analytics summary", detail: error.message });
  }
};
