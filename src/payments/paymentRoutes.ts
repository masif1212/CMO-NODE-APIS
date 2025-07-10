// -------------------------------------------------
// FILE: paymentRoutes.ts (Corrected)
// -------------------------------------------------
import { Router } from "express";
import { authenticateToken } from "../middleware/auth"; // Assuming this middleware exists
import { payAsYouGo, savePaymentMethod, getPaymentHistory, webhookHandler } from "./paymentController";
import express from "express";

const paymentRouter = Router();

// Route for pay-as-you-go analysis
paymentRouter.post("/analyze", authenticateToken, payAsYouGo);

// Route to save a payment method
paymentRouter.post("/methods", authenticateToken, savePaymentMethod);

// Route to get payment history
paymentRouter.get("/history", authenticateToken, getPaymentHistory);

// Webhook route for Checkout.com
// It needs a raw body, so we use express.raw() middleware
paymentRouter.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

export default paymentRouter;
