import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
// Import the MySQL session store.
// You'll need to install it: npm install express-mysql-session
import MySQLStore from "express-mysql-session";
import mysql from "mysql2/promise"; // This is still needed by express-mysql-session internally

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

// Health check / test route
app.get("/", (_req, res) => {
  res.send("Hello");
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Enable CORS for your frontend URL
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_BASE_URL, // Frontend URL
    credentials: true, // Allow cookies to be sent/received for cross-origin requests
  })
);

// IMPORTANT: Trust the proxy when deployed to platforms like Google Cloud Run.
// Cloud Run acts as a reverse proxy, and without this, Express/express-session
// will not correctly identify the connection as HTTPS, even if it is.
// This is crucial for the 'secure' cookie flag to work.
app.set("trust proxy", 1); // Crucial for Cloud Run

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore({
      uri: process.env.DATABASE_URL,
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 1000 * 60 * 60 * 24,
      createDatabaseTable: true,
      endConnectionOnClose: true,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Main dashboard route
app.use("/api/main_dashboard", mainDashboard);

//form data route
app.use("/api/user-requirements", userRequirementsRouter);

//route for scrapping data
app.use("/api/scrape", routes);

//dashboard1 routes
app.use("/api/pagespeed", pageSpeedRouter); //website health audit
app.use("/api/users", usersRouter); // user management (e.g., login, registration)

app.use("/api/auth", authRouter);
app.use("/ga", authRouter); // Note: Using authRouter for /ga; confirm if this is intentional and correct

app.use("/api/technical_seo", technicalSeoRouter);

app.use("/api/geo", geo_llm);

app.use("/api/dashboardRouter1", dashboardRouter1); // recommendation by mo for dashboard 1

//dashboard2 routes
app.use("/api/social_media/youtube", youtubeRouter);

//dashboard3 routes
app.use("/api/competitors", competitorRouter);

//dashboard4 routes
app.use("/api/cmo-recommendation", cmoRecommendationRouter);

// Global error handler
app.use(errorHandler);

export default app;
