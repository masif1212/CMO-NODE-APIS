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
app.set("trust proxy", 1);

// Configure MySQL session store options using a single connection URI
const sessionStoreOptions = {
  // Use 'uri' to provide the full connection string from your environment variables
  uri: process.env.DATABASE_URL,
  clearExpired: true, // Clear expired sessions from the database
  checkExpirationInterval: 900000, // How frequently to check for expired sessions (15 minutes)
  expiration: 1000 * 60 * 60 * 24, // The maximum age of a valid session (1 day)
  createDatabaseTable: true, // Create the sessions table automatically if it doesn't exist
  endConnectionOnClose: true, // End the MySQL connection when the store is closed
};

// Create a new MySQLStore instance
const sessionStore = new MySQLStore(sessionStoreOptions);

// Session setup for Google auth
app.use(
  session({
    secret: process.env.SESSION_SECRET!, // A strong, randomly generated secret is crucial for production
    resave: false, // Do not save session if unmodified
    saveUninitialized: false, // Do not create a session until something is stored (e.g., after successful login)

    // Configure the MySQL session store
    store: sessionStore,

    cookie: {
      // Set 'secure' to true in production. This ensures the cookie is only sent over HTTPS.
      // This requires 'app.set("trust proxy", 1)' if behind a proxy like Cloud Run.
      secure: process.env.NODE_ENV === "production",

      // 'httpOnly' prevents client-side JavaScript from accessing the cookie, enhancing security.
      httpOnly: true,

      // 'sameSite' is critical for cross-origin requests.
      // 'none' allows cross-site cookies, but REQUIRES 'secure: true'.
      // 'lax' is a good default for same-site, but might not work for your OAuth redirect if domains differ.
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      // 'maxAge' sets the expiration time for the cookie (in milliseconds).
      // This should match the 'expiration' setting in your MySQLStore options.
      maxAge: 1000 * 60 * 60 * 24, // 1 day

      // 'domain' can be set if your frontend and backend are on different subdomains
      // of the same main domain (e.g., app.example.com and api.example.com).
      // Otherwise, leave it undefined; the browser will set it to the host that set the cookie.
      // domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined,
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
