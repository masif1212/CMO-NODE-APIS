import { Request, Response } from "express";
import checkout from "checkout-sdk-node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const cko = new checkout(process.env.CHECKOUT_SECRET_KEY!);

// Subscription Payment API
export const Subscription = async (req: Request, res: Response): Promise<void> => {
     const { token, plan_id } = req.body;
     const user_id = (req as any).user.user_id;

     if (!token || !plan_id) {
          res.status(400).json({ error: 'Missing required fields: token, plan_id' });
          return;
     }

     try {
          // Fetch plan details
          const plan = await prisma.plans.findUnique({ where: { plan_id } });
          if (!plan) {
               res.status(404).json({ error: 'Plan not found' });
               return;
          }

          const payment: any = await cko.payments.request({
               source: { type: 'token', token },
               amount: Math.round(Number(plan.price) * 100), // Convert to cents
               currency: plan.currency,
               reference: `subscription_${plan_id}_${user_id}`,
               metadata: { user_id, plan_id },
          });

              if ((payment as any).status === 'Authorized' || (payment as any).status === 'Captured') {
               // Create subscription
               const subscription = await prisma.subscriptions.create({
                    data: {
                         user_id,
                         plan_id,
                         start_date: new Date(),
                         end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day subscription
                         status: 'active',
                         payment_status: 'paid',
                    },
               });

               // Record payment
               await prisma.payments.create({
                    data: {
                         user_id,
                         amount: plan.price,
                         currency: plan.currency,
                         payment_method: 'card',
                         payment_status: (payment as any).status,
                         transaction_id: (payment as any).id,
                         subscription_id: subscription.subscription_id,
                    },
               });

               res.json({ success: true, subscription });
               return;
          } else {
               res.status(400).json({ error: 'Payment not authorized' });
               return;
          }
     } catch (error) {
          console.error('Subscription payment error:', error);
          res.status(500).json({ error: 'Internal server error' });
          return;
     }
}

// Pay-as-You-Go Payment API
export const PayAsYouGo = async (req: Request, res: Response): Promise<void> => {
     const { token, website_id, analysis_type } = req.body;
     const user_id = (req as any).user.user_id;

     if (!token || !website_id || !analysis_type) {
          res.status(400).json({ error: 'Missing required fields: token, website_id, analysis_type' });
          return;
     }

     // Define analysis costs
     const ANALYSIS_COSTS: Record<string, number> = {
          brand_website: 1.00,
          pagespeed: 1.00,
          traffic: 2.00,
          social_media: 1.50,
          competitor: 3.00,
     };

     const cost = ANALYSIS_COSTS[analysis_type];
     if (!cost) {
          res.status(400).json({ error: 'Invalid analysis type' });
          return;
     }

     try {
          // Verify website belongs to user
          const website = await prisma.user_websites.findFirst({
               where: { website_id, user_id },
          });
          if (!website) {
               res.status(404).json({ error: 'Website not found or unauthorized' });
               return;
          }

          // Request payment
          const payment = await cko.payments.request({
               source: { type: 'token', token },
               amount: Math.round(cost * 100),
               currency: 'USD',
               reference: `analysis_${analysis_type}_${website_id}`,
               metadata: { user_id, website_id, analysis_type },
          });

          if ((payment as any).status === 'Authorized' || (payment as any).status === 'Captured') {
               // Record payment
               const paymentRecord = await prisma.payments.create({
                    data: {
                         user_id,
                         amount: cost,
                         currency: 'USD',
                         payment_method: 'card',
                         payment_status: (payment as any).status,
                         transaction_id: (payment as any).id,
                         website_id,
                         analysis_type,
                    },
               });


               res.json({ success: true, payment: paymentRecord });
               return;
          } else {
               res.status(400).json({ error: 'Payment not authorized' });
               return;
          }
     } catch (error) {
          console.error('Analysis payment error:', error);
          res.status(500).json({ error: 'Internal server error' });
          return;
     }
}

// Web Hook
export const WebHook = async (req: Request, res: Response): Promise<void> => {
     const event = req.body;

     // TODO: Implement webhook signature verification (see Checkout.com docs)
     const signature = req.headers['cko-signature'];
     // Add verification logic here

     try {
          if (event.type === 'payment_captured') {
               const transaction_id = event.data.id;
               const payment = await prisma.payments.findFirst({
                    where: { transaction_id },
               });

               if (payment) {
                    await prisma.payments.update({
                         where: { payment_id: payment.payment_id },
                         data: { payment_status: 'Captured' },
                    });

                    if (payment.subscription_id) {
                         await prisma.subscriptions.update({
                              where: { subscription_id: payment.subscription_id },
                              data: { payment_status: 'paid', status: 'active' },
                         });
                    } else if (payment.website_id && payment.analysis_type) {
                         return;
                    }
               }
          }
          res.sendStatus(200);
          return;
     } catch (error) {
          console.error('Webhook error:', error);
          res.sendStatus(500);
          return;
     }
} 