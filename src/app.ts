import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import usersRouter from "./modules/users/router";
import pageSpeedRouter from "./modules/dashboard1/website_audit/router";
import authRouter , { dashboardRouter1 }from "./modules/dashboard1/traffic_analysis/router";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./modules/scraped_data/router";
import youtubeRouter from "./modules/dashboard2/router";
import { competitorRouter } from "./modules/dashboard3/competitor.routes";
import geo_llm from "./modules/dashboard1/geo/router";
import userRequirementsRouter from "./modules/form_data/router";
import mainDashboard from "./modules/dashboard/dashboard.router"; 
import technicalSeoRouter from "./modules/dashboard1/technical_seo/tech_router";
// import dashboard4Router from "./modules/dashboard4/router";
import cmoRecommendationRouter from './modules/dashboard4/router';
import paymentRouter from "./payments/paymentRoutes";





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



// Main dashboard route
app.use("/api/main_dashboard", mainDashboard);
app.use("/api/payment", paymentRouter);


//form data route
app.use("/api/user-requirements", userRequirementsRouter);


//route for scrapping data
app.use("/api/scrape", routes);


//dashboard1 routes

app.use("/api/pagespeed", pageSpeedRouter);//website health audit
app.use("/api/users", usersRouter);// googe auth api

app.use("/api/auth", authRouter);
app.use("/ga", authRouter); // Note: Using authRouter for /ga; confirm if this is intentional

app.use("/api/technical_seo", technicalSeoRouter);

app.use("/api/geo", geo_llm);

app.use("/api/dashboardRouter1", dashboardRouter1); // recommendation by mo for dashboard 1

//dashboard2 routes
app.use("/api/social_media/youtube", youtubeRouter);

//dashboard3 routes

app.use('/api/competitors', competitorRouter);



//dashboard4 routes
// app.use("/api/recommendationbycmo", dashboard4Router);
app.use('/api/cmo-recommendation', cmoRecommendationRouter);

// Global error handler
app.use(errorHandler);

export default app;
