import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import * as expressSession from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import mysql from "mysql2";

// All routers must be express.Router() objects
import usersRouter from "./modules/users/router";
import pageSpeedRouter from "./modules/dashboard1/website_audit/router";
import authRouter from "./modules/dashboard1/traffic_analysis/router";
import { dashboardRouter1 } from "./modules/dashboard1/traffic_analysis/router";
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

// Basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes (explicitly typed)

app.get("/", (_req, res) => {
  res.send("Hello"); // ✅ Will NOT throw error unless something above breaks Express types
});
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

// CORS setup
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_BASE_URL,
    credentials: true,
  })
);

// Enable 'trust proxy' if behind reverse proxy (e.g. Google Cloud Run)
app.set("trust proxy", 1);

// ✅ MySQL session store using URI and Pool, with types bypassed for compatibility
const pool = mysql.createPool(process.env.DATABASE_URL!);
const MySQLStore = MySQLStoreFactory(expressSession) as any;
const sessionStore = new MySQLStore({}, pool);

// ✅ Session middleware
app.use(
  expressSession.default({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// ✅ API Routes — all must be Router objects
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
