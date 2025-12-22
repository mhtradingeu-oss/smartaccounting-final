
jest.unmock('../../src/services/stripeService');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    invoices: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
  }));
});

const stripeService = require('../../src/services/stripeService');
const stripeClient = require('stripe')();
console.log('stripeService type', typeof stripeService);
console.log('stripeService keys', Object.keys(stripeService));
stripeService.setStripeClient(stripeClient);

describe('Stripe Service', () => {
  describe('Customer Management', () => {
    test('should create customer', async () => {
      const customerData = {
        email: 'customer@example.com',
        name: 'Test Customer',
      };

      // Mock the stripe customer creation
      const mockCustomer = { id: 'cus_test123', ...customerData };
      stripeClient.customers.create.mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer(customerData);
      expect(result.id).toBe('cus_test123');
    });

    test('should handle customer creation error', async () => {
      stripeClient.customers.create.mockRejectedValue(new Error('Stripe error'));

      await expect(stripeService.createCustomer({}))
        .rejects.toThrow('Stripe error');
    });
  });

  describe('Subscription Management', () => {
    test('should create subscription', async () => {
      const subscriptionData = {
        customer: 'cus_test123',
        items: [{ price: 'price_test123' }],
      };

      const mockSubscription = { id: 'sub_test123', ...subscriptionData };
      stripeClient.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await stripeService.createSubscription(subscriptionData);
      expect(result.id).toBe('sub_test123');
    });
  });
});
