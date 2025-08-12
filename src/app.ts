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
import youtubeRouter from "./modules/dashboard2/youtube/router";
import  linkledinRouter from "./modules/dashboard2/linkedlin/linkedlin_router";
import googleAdsRouter  from "./modules/dashboard2/google_ads/google_ads_router";
import  getfacebookAdsRouter from "./modules/dashboard2/facebook_ads/facebook_ads_router";
import { competitorRouter } from "./modules/dashboard3/competitor.routes";
import geo_llm from "./modules/dashboard1/geo/router";
import userRequirementsRouter from "./modules/form_data/router";
import mainDashboard from "./modules/dashboard/dashboard.router";
import technicalSeoRouter from "./modules/dashboard1/technical_seo/tech_router";
import cmoRecommendationRouter from "./modules/dashboard4/router";
import paymentRouter from "./payments/paymentRoutes";
import facebookRoutes from './modules/dashboard2/facebook/facebook_router';
import instagramRoutes from './modules/dashboard2/instagram/instagram_router';
import { dashboardRouter2 } from "./modules/dashboard2/llm_suggestions/router";
import  getUserdata  from "./modules/admin_dashboard/admin_router";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_BASE_URL, // Frontend URL
    credentials: true, // Allow cookies for cross-origin requests
  })
);

// ✅ *** FIX ADDED HERE ***
// Trust the reverse proxy (e.g., Google Cloud Run's load balancer)
// This must be set for secure cookies to work in production.
app.set("trust proxy", 1);

// Session setup for Google auth
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false, // This is correct, do not change to true
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Required for cross-site cookies
    },
  })
);

//admin dashboard routes

app.use("/api/admin", getUserdata);

// Main dashboard route
app.use("/api/main_dashboard", mainDashboard);
app.use("/api/payment", paymentRouter);

//form data route
app.use("/api/user-requirements", userRequirementsRouter);

//route for scrapping data
app.use("/api/scrape", routes);

//dashboard1 routes
app.use("/api/pagespeed", pageSpeedRouter); //website health audit
app.use("/api/users", usersRouter); // googe auth api

app.use("/api/auth", authRouter);
app.use("/ga", authRouter); // Note: Using authRouter for /ga; confirm if this is intentional

app.use("/api/technical_seo", technicalSeoRouter);

app.use("/api/geo", geo_llm);

app.use("/api/dashboard1", dashboardRouter1); // recommendation by mo for dashboard 1
//dashboard2 routes

app.use('/api/facebook', facebookRoutes);
app.use('/api/instagram', instagramRoutes);
app.use("/api/youtube", youtubeRouter);
app.use("/api/linkedlin", linkledinRouter);
app.use("/api/google_ads", googleAdsRouter);
app.use("/api/facebook_ads", getfacebookAdsRouter); // Note: This is a function, not a router
app.use("/api/dashboardRouter2", dashboardRouter2); 

//dashboard3 routes
app.use("/api/competitors", competitorRouter);

//dashboard4 routes
app.use("/api/cmo-recommendation", cmoRecommendationRouter);

// Global error handler
app.use(errorHandler);

export default app;
