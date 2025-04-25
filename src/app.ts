import express from "express";
import usersRouter from "./modules/users/router";
import { errorHandler } from "./middleware/errorHandler";
import pageSpeedRouter from "./modules/pagespeed/router";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import "./config/passport";
import authRouter from "./modules/google_auth/router";
import googleRouter from "./modules/google_auth/router";
const cors = require("cors");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Mount the router on the correct path
app.use("/api/users", usersRouter);

// Global error handler
app.use(errorHandler);

app.use("/api/pagespeed", pageSpeedRouter);

//GOOGLE AUTHENTICATION

// 🔐 Session setup (required for storing tokens)
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use("/api/auth", authRouter);
app.use("/ga", googleRouter);

export default app;
