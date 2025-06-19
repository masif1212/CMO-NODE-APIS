import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import usersRouter from "./modules/users/router";
import pageSpeedRouter from "./modules/dashboard1/pagespeed/router";
import authRouter , { dashboardRouter1 }from "./modules/dashboard1/google_auth/router";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./modules/scraped_data/router";
import youtubeRouter from "./modules/dashboard2/router";
import { competitorRouter } from "./modules/dashboard3/competitor.routes";
import brandAuditRouter from "./modules/llm_call/router";
import geo_llm from "./modules/dashboard1/geo_llm/router"; // ✅ Import
import userRequirementsRouter from "./modules/form_data/router";
import mainDashboard from "./modules/dashboard/dashboard.router"; // Adjust path as needed




// Register new route


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

// Session setup for Google auth
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);


app.use("/api/users", usersRouter);
app.use("/api/pagespeed", pageSpeedRouter);
app.use("/api/auth", authRouter);
app.use("/ga", authRouter); // Note: Using authRouter for /ga; confirm if this is intentional
app.use("/api", mainDashboard);

// Existing routes...
app.use("/api/scrape", routes); 
app.use('/api/competitors', competitorRouter);
app.use("/api/brand-audit", brandAuditRouter);

app.use("/api/social_media/youtube", youtubeRouter);

app.use("/api/dashboardRouter1", dashboardRouter1);

app.use("/api/user-requirements", userRequirementsRouter);




app.use("/api/geo_llm", geo_llm);
// Global error handler
app.use(errorHandler);

export default app;
