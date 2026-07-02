const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class Billing {

  static async createCustomer(email) {
    return stripe.customers.create({ email });
  }

  static async createSubscription(customerId, priceId) {
    return stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
  }

}

module.exports = Billing;
