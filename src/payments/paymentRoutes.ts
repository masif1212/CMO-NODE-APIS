import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PayAsYouGo, Subscription, WebHook } from './paymentController';

const PaymentRouter = Router();

PaymentRouter.post('/subscribe', authenticateToken, Subscription);
PaymentRouter.post('/analyze', authenticateToken, PayAsYouGo)
PaymentRouter.post('/webhook', WebHook)


export default PaymentRouter;