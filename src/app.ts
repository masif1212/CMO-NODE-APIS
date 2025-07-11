import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import usersRouter from "./modules/users/router";
import pageSpeedRouter from "./modules/dashboard1/website_audit/router";
import authRouter, { dashboardRouter1 } from "./modules/dashboard1/traffic_analysis/router";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./modules/scraped_data/router";
import youtubeRouter from "./modules/dashboard2/router";
import { competitorRouter } from "./modules/dashboard3/competitor.routes";
import geo_llm from "./modules/dashboard1/geo/router";
import userRequirementsRouter from "./modules/form_data/router";
import mainDashboard from "./modules/dashboard/dashboard.router";
import technicalSeoRouter from "./modules/dashboard1/technical_seo/tech_router";
import cmoRecommendationRouter from "./modules/dashboard4/router";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Trust the first proxy hop (essential for Cloud Run)
app.set("trust proxy", 1);

// === ✅ CORS CONFIGURATION ===
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_BASE_URL || "https://cmo-nextjs-app-199341392650.us-central1.run.app",
    credentials: true,
  })
);

// === ✅ SESSION CONFIGURATION ===
app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // This now works correctly because of 'trust proxy'
      sameSite: "none", // Required for cross-domain cookies
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
// Routers
app.use("/api/main_dashboard", mainDashboard);
app.use("/api/user-requirements", userRequirementsRouter);
app.use("/api/scrape", routes);
app.use("/api/pagespeed", pageSpeedRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/ga", authRouter);
app.use("/api/technical_seo", technicalSeoRouter);
app.use("/api/geo", geo_llm);
app.use("/api/dashboardRouter1", dashboardRouter1);
app.use("/api/social_media/youtube", youtubeRouter);
app.use("/api/competitors", competitorRouter);
app.use("/api/cmo-recommendation", cmoRecommendationRouter);

// Global error handler
app.use(errorHandler);

export default app;
