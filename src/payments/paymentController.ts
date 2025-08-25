// -------------------------------------------------
// FILE: paymentController.ts (Updated)
// -------------------------------------------------
import { Request, Response } from "express";
import { Checkout, Webhooks } from "checkout-sdk-node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cko = new Checkout(process.env.CHECKOUT_SECRET_KEY!);

// --- TYPE DEFINITIONS ---
interface CkoPaymentResponse {
  id: string;
  status: string;
  source?: {
    id: string;
    scheme: string;
    last4: string;
  };
}

interface WebhookEvent {
  type: string;
  data: {
    id: string;
  };
}

interface CkoCustomerResponse {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
  };
}

// Define a custom error for easy identification
class CustomerConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerConflictError";
  }
}

const getOrCreateCustomer = async (user_id: string, email: string): Promise<string> => {
  // 1. Check your local database first. This part is correct.
  const user = await prisma.users.findUnique({ where: { user_id } });

  if (user?.checkout_customer_id) {
    return user.checkout_customer_id;
  }

  // 2. Try to create the customer
  try {
    const customer = (await cko.customers.create({
      email: email,
      name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
      metadata: { internal_id: user_id },
    })) as CkoCustomerResponse;

    // 3. Save the new ID to your database
    await prisma.users.update({
      where: { user_id },
      data: { checkout_customer_id: customer.id },
    });

    return customer.id;
  } catch (error: any) {
    // 4. Catch the specific error and re-throw it as our custom error
    if (error.body?.error_codes?.includes("customer_email_already_exists")) {
      throw new CustomerConflictError("A customer with this email already exists on the payment platform but is not linked to this account.");
    }
    // Re-throw any other unexpected errors
    throw error;
  }
};

// --- API CONTROLLERS ---

// NEW: Function to get saved payment methods
export const getPaymentMethods = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { user_id } = req.user!;
  try {
    const methods = await prisma.paymentMethods.findMany({
      where: { user_id },
      orderBy: { created_at: "asc" },
    });
    res.json({ success: true, methods });
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ error: "Failed to retrieve payment methods." });
  }
};

export const savePaymentMethod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { token } = req.body;
  const { user_id, email } = req.user!;

  if (!token) {
    res.status(400).json({ error: "A payment token is required." });
    return;
  }

  try {
    const customer_id = await getOrCreateCustomer(user_id, email);

    const source = await (cko.sources as any).request({
      type: "token",
      token: token,
      customer: { id: customer_id },
    });

    const existingMethod = await prisma.paymentMethods.findFirst({
      where: { user_id, last4: source.last4, card_type: source.scheme },
    });

    if (existingMethod) {
      res.json({ success: true, message: "Payment method already exists.", method: existingMethod });
      return;
    }

    const newMethod = await prisma.paymentMethods.create({
      data: {
        user_id,
        checkout_source_id: source.id,
        card_type: source.scheme,
        last4: source.last4,
        is_default: (await prisma.paymentMethods.count({ where: { user_id } })) === 0,
      },
    });

    res.status(201).json({ success: true, method: newMethod });
  } catch (error: any) {
    console.error("Save payment method error:", error);
    res.status(500).json({ error: "Could not save payment method.", details: error.body });
  }
};

export const payAsYouGo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { token, analysis_types, save_card, source_id,report_id, detail } = req.body;
  const { user_id, email } = req.user!;

  if (!analysis_types || !Array.isArray(analysis_types) || analysis_types.length === 0) {
    res.status(400).json({ error: "You must select at least one analysis service." });
    return;
  }
  if (!token && !source_id) {
    res.status(400).json({ error: "A payment method (new or saved) is required." });
    return;
  }
  console.log(analysis_types);

  try {
    const analysisServices = await prisma.analysisServices.findMany({
      where: { type: { in: analysis_types } },
    });
    console.log(analysisServices);

    if (analysisServices.length !== analysis_types.length) {
      res.status(400).json({ error: "One or more selected analysis types are invalid." });
      return;
    }

    const totalCost = analysisServices.reduce((sum, service) => sum + Number(service.price), 0);
    const customer_id = await getOrCreateCustomer(user_id, email);

    const payment = (await cko.payments.request({
      source: source_id ? { id: source_id } : { type: "token", token },
      amount: Math.round(totalCost * 100),
      currency: "USD",
      reference: `analysis-${analysis_types.join("-")}-${user_id}`,
      metadata: { user_id, analysis_types: analysis_types.join(",") },
      customer: { id: customer_id, email: email },
      processing_channel_id: process.env.CKO_PROCESSING_CHANNEL_ID,
      capture: true,
    })) as CkoPaymentResponse;

    if (save_card && token && payment.source?.id) {
      const existingMethod = await prisma.paymentMethods.findFirst({
        where: { checkout_source_id: payment.source.id },
      });
      if (!existingMethod) {
        await prisma.paymentMethods.create({
          data: {
            user_id,
            checkout_source_id: payment.source.id,
            card_type: payment.source.scheme,
            last4: payment.source.last4,
            is_default: (await prisma.paymentMethods.count({ where: { user_id } })) === 0,
          },
        });
      }
    }

    const paymentRecord = await prisma.payments.create({
      data: {
        user_id,
        amount: totalCost,
        report_id,
        detail,
        currency: "USD",
        payment_method: payment.source?.scheme || "card",
        payment_status: payment.status,
        transaction_id: payment.id,
        analysis_type: analysis_types.join(","),
      },
    });

    if (payment.status === "Authorized" || payment.status === "Captured") {
      res.json({ success: true, payment: paymentRecord });
    } else {
      res.status(400).json({ success: false, error: "Payment was not successful.", details: payment });
    }
  } catch (error: any) {
    console.error("Pay-as-you-go error:", error);
    res.status(500).json({ error: "An internal error occurred during payment processing.", details: error.body });
  }
};

export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { user_id } = req.user!;
  try {
    const payments = await prisma.payments.findMany({
      where: { user_id },
      orderBy: { created_at: "desc" },
    });
    res.json({ success: true, history: payments });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ error: "Failed to retrieve payment history." });
  }
};

export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const expectedAuthKey = process.env.CHECKOUT_WEBHOOK_AUTH_KEY;
  if (expectedAuthKey && authHeader !== expectedAuthKey) {
    res.status(401).send("Unauthorized");
    return;
  }

  const ckoSignature = req.headers["cko-signature"] as string;
  const rawBody = (req as any).rawBody;

  try {
    const event: WebhookEvent = (Webhooks as any).verify(rawBody, process.env.CHECKOUT_WEBHOOK_SECRET!, ckoSignature);
    const transaction_id = event.data.id;

    let newStatus = "";
    switch (event.type) {
      case "payment_captured":
        newStatus = "Captured";
        break;
      case "payment_declined":
        newStatus = "Declined";
        break;
    }

    if (newStatus) {
      await prisma.payments.updateMany({
        where: { transaction_id },
        data: { payment_status: newStatus },
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    res.status(400).send("Webhook signature verification failed.");
  }
};

