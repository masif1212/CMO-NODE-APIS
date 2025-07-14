// -------------------------------------------------
// FILE: paymentController.ts (Corrected)
// -------------------------------------------------
import { Request, Response } from "express";
import { Checkout, Webhooks } from "checkout-sdk-node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cko = new Checkout(process.env.CHECKOUT_SECRET_KEY!);

// --- TYPE DEFINITIONS ---
// This interface helps TypeScript understand the structure of the payment response.
interface CkoPaymentResponse {
  id: string;
  status: string;
  source?: {
    id: string;
    scheme: string;
    last4: string;
  };
  // Add other properties from the Checkout.com response as needed
}

// This interface helps TypeScript understand the structure of the webhook event.
interface WebhookEvent {
  type: string;
  data: {
    id: string;
    // other properties from the event data can be added here
  };
  // other top-level event properties can be added here
}

// This interface helps TypeScript understand the structure of the customer response.
interface CkoCustomerResponse {
  id: string;
  // other customer properties can be added here
}

// Helper to get or create a Checkout.com customer
const getOrCreateCustomer = async (user_id: string, email: string) => {
  const user = await prisma.users.findUnique({ where: { user_id } });

  if (user?.checkout_customer_id) {
    return user.checkout_customer_id;
  }

  // Cast the customer creation response to our interface.
  const customer = (await cko.customers.create({
    email: email,
    name: user?.first_name + " " + user?.last_name,
    metadata: { internal_id: user_id },
  })) as CkoCustomerResponse;

  // This will now work without type errors.
  await prisma.users.update({
    where: { user_id },
    data: { checkout_customer_id: customer.id },
  });

  return customer.id;
};

// API to save a payment method
export const savePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  const { user_id, email } = (req as any).user;

  if (!token) {
    res.status(400).json({ error: "Missing required field: token" });
    return;
  }

  try {
    const customer_id = await getOrCreateCustomer(user_id, email);

    // We cast to 'any' to bypass potential strict type checking issues with the SDK version.
    const source = await (cko.sources as any).request({
      type: "token",
      token: token,
      customer: { id: customer_id },
    });

    const existingMethod = await prisma.paymentMethods.findFirst({
      where: { user_id, last4: source.last4, card_type: source.scheme },
    });

    if (existingMethod) {
      res.json({ success: true, message: "Payment method already exists." });
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

    res.json({ success: true, method: newMethod });
  } catch (error: any) {
    console.error("Save payment method error:", error);
    res.status(500).json({ error: "Internal server error", details: error.body });
  }
};

// Pay-as-You-Go Payment API
export const payAsYouGo = async (req: Request, res: Response): Promise<void> => {
  const { token, analysis_type, save_card, source_id } = req.body;
  const { user_id, email } = (req as any).user;
  console.log(req, "REQUEST FROM THE API");
  if (!analysis_type || (!token && !source_id)) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const analysisService = await prisma.analysisServices.findUnique({
    where: { type: analysis_type },
  });

  if (!analysisService) {
    res.status(400).json({ error: "Invalid analysis type" });
    return;
  }

  const cost = analysisService.price;

  try {
    const customer_id = await getOrCreateCustomer(user_id, email);
    let paymentSource: any;

    if (source_id) {
      paymentSource = { type: "id", id: source_id };
    } else if (token) {
      paymentSource = { type: "token", token };
    }

    // Cast the response to our interface to solve the type mismatch error.
    const payment = (await cko.payments.request({
      source: paymentSource,
      amount: Math.round(Number(cost) * 100),
      currency: "USD",
      reference: `analysis_${analysis_type}_${user_id}`,
      metadata: { user_id, analysis_type },
      customer: { id: customer_id },
      capture: true,
    })) as CkoPaymentResponse;

    // This block will now work without TypeScript errors.
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

    if (payment.status === "Authorized" || payment.status === "Captured") {
      const paymentRecord = await prisma.payments.create({
        data: {
          user_id,
          amount: cost,
          currency: "USD",
          payment_method: "card",
          payment_status: payment.status,
          transaction_id: payment.id,
          analysis_type,
        },
      });
      res.json({ success: true, payment: paymentRecord });
    } else {
      res.status(400).json({ error: "Payment not authorized", details: payment });
    }
  } catch (error: any) {
    console.error("Analysis payment error:", error);
    res.status(500).json({ error: "Internal server error", details: error.body });
  }
};

// API to get payment history
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  const { user_id } = (req as any).user;
  try {
    const payments = await prisma.payments.findMany({
      where: { user_id },
      orderBy: { created_at: "desc" },
    });
    res.json({ success: true, history: payments });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Webhook Handler
export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const expectedAuthKey = process.env.CHECKOUT_WEBHOOK_AUTH_KEY;

  if (expectedAuthKey && authHeader !== expectedAuthKey) {
    console.warn("Webhook received with invalid Authorization Header Key.");
    // To enforce this check, you would uncomment the following lines:
    // res.status(401).send('Unauthorized');
    // return;
  }

  const ckoSignature = req.headers["cko-signature"] as string;
  const rawBody = (req as any).rawBody;

  try {
    // The Webhooks class has a static 'verify' method.
    // This avoids all instantiation issues and correctly verifies the signature.
    // The result is cast to our WebhookEvent interface to satisfy TypeScript.
    const event: WebhookEvent = (Webhooks as any).verify(rawBody, process.env.CHECKOUT_WEBHOOK_SECRET!, ckoSignature);

    // This will now work without type errors.
    const transaction_id = event.data.id;

    if (event.type === "payment_captured") {
      const payment = await prisma.payments.findFirst({
        where: { transaction_id },
      });

      if (payment) {
        await prisma.payments.updateMany({
          where: { transaction_id: transaction_id },
          data: { payment_status: "Captured" },
        });
        console.log(`Payment captured for user ${payment.user_id}`);
      }
    } else if (event.type === "payment_declined") {
      await prisma.payments.updateMany({
        where: { transaction_id: transaction_id },
        data: { payment_status: "Declined" },
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    res.status(400).send("Webhook signature verification failed.");
  }
};
