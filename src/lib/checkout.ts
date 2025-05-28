import { Checkout } from 'checkout-sdk-node';

const checkout = new Checkout('your api secret here', {
     client: 'ack_XXXXXXXX',
     scope: ['gateway'], // or whatever scope required
     environment: 'sandbox', // or 'production'
});

export default checkout;