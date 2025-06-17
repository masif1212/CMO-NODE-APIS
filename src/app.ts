import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import usersRouter from "./modules/users/router";
import pageSpeedRouter from "./modules/pagespeed/router";
import authRouter from "./modules/google_auth/router";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./modules/scraped_data/router";
import youtubeRouter from "./modules/social_media/router";
import { competitorRouter } from "./modules/competitor_analysis/competitor.routes";
import brandAuditRouter from "./modules/llm_call/router";
import dashboardRouter from "./modules/dashboard/dashboard.router";
import geo_llm from "./modules/geo_llm/router"; // ✅ Import
import userRequirementsRouter from "./modules/form_data/router";


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

// Existing routes...
app.use("/api/scrape", routes); 
app.use('/api/competitors', competitorRouter);
app.use("/api/brand-audit", brandAuditRouter);

app.use("/api/social_media/youtube", youtubeRouter);

app.use("/api", dashboardRouter);

app.use("/api/user-requirements", userRequirementsRouter);


app.use("/api/geo_llm", geo_llm);
// Global error handler
app.use(errorHandler);

export default app;
