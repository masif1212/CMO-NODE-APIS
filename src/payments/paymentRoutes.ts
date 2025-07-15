// -------------------------------------------------
// FILE: paymentRoutes.ts (Updated)
// -------------------------------------------------
import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
// CHANGED: Import the new getPaymentMethods function
import { payAsYouGo, savePaymentMethod, getPaymentHistory, webhookHandler, getPaymentMethods } from "./paymentController";
import express from "express";

const paymentRouter = Router();

// Route for pay-as-you-go analysis
paymentRouter.post("/analyze", authenticateToken, payAsYouGo);

// NEW: Route to GET saved payment methods
paymentRouter.get("/methods", authenticateToken, getPaymentMethods);

// Route to POST (save) a new payment method
paymentRouter.post("/methods", authenticateToken, savePaymentMethod);

// Route to get payment history
paymentRouter.get("/history", authenticateToken, getPaymentHistory);

// Webhook route for Checkout.com
paymentRouter.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

export default paymentRouter;
