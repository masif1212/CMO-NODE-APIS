import { Checkout } from 'checkout-sdk-node';

const checkout = new Checkout(process.env.CHECKOUT_SECRET_KEY || '', {
     client: 'your-client-name', // Replace with your client id
     environment: 'sandbox', // Switch to 'live' for production
});

export default checkout;