const Stripe = require('stripe');
const logger = require('../lib/logger');
const { Company } = require('../models');
const { PLAN_CATALOG } = require('../config/plans');

const FALLBACK_PLANS = [
  {
    id: 'price_basic_monthly',
    nickname: 'Starter Monthly',
    amount: PLAN_CATALOG.basic.price.monthlyCents,
    currency: PLAN_CATALOG.basic.price.currency,
    interval: 'month',
    features: PLAN_CATALOG.basic.highlights,
  },
  {
    id: 'price_pro_monthly',
    nickname: 'Professional Monthly',
    amount: PLAN_CATALOG.pro.price.monthlyCents,
    currency: PLAN_CATALOG.pro.price.currency,
    interval: 'month',
    features: PLAN_CATALOG.pro.highlights,
  },
];

class StripeService {
  constructor() {
    this.overrideClient = null;
    this.defaultClient = null;
  }

  setStripeClient(client) {
    this.overrideClient = client;
  }

  getClient() {
    if (this.overrideClient) {return this.overrideClient;}
    if (this.defaultClient) {return this.defaultClient;}

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.defaultClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });

    return this.defaultClient;
  }

  async getPricingPlans() {
    try {
      const client = this.getClient();
      const plans = await client.prices.list({ limit: 5 });
      if (plans.data.length) {
        return plans.data;
      }
    } catch (error) {
      logger.warn('Unable to fetch Stripe plans, returning fallback', { error: error.message });
    }
    return FALLBACK_PLANS;
  }

  async createCustomer(companyOrPayload, user) {
    const client = this.getClient();
    const payloadSource = companyOrPayload || {};
    const isCompanyInstance = payloadSource && typeof payloadSource.save === 'function';
    const companyId =
      (isCompanyInstance && payloadSource.id) || payloadSource.companyId || user?.companyId;

    const payload = {
      email: payloadSource.email || user?.email,
      name: payloadSource.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      metadata: {
        ...(payloadSource.metadata || {}),
        companyId,
        userId: user?.id,
      },
    };

    const customer = await client.customers.create(payload);

    if (isCompanyInstance) {
      await payloadSource.update({
        stripeCustomerId: customer.id,
      });
    } else if (companyId) {
      await Company.update(
        { stripeCustomerId: customer.id },
        { where: { id: companyId } },
      );
    }

    return customer;
  }

  async getSubscriptionStatus(companyId) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return { status: 'missing', companyId };
    }
    return {
      companyId,
      subscriptionId: company.stripeSubscriptionId || null,
      subscriptionStatus: company.subscriptionStatus || 'inactive',
      plan: company.subscriptionPlan || 'basic',
    };
  }

  async createSubscription(payload, planId, userId) {
    const hasStripePayload = payload && typeof payload === 'object' && payload.customer;
    const client = this.getClient();

    if (hasStripePayload) {
      return client.subscriptions.create(payload);
    }

    const companyId = payload;
    const company = await Company.findByPk(companyId);
    const customerId = company?.stripeCustomerId || `cus_${companyId}`;

    const subscription = await client.subscriptions.create({
      customer: customerId,
      items: [{ price: planId }],
      metadata: { companyId, createdBy: userId },
    });

    if (company) {
      await company.update({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status || 'active',
        stripeCustomerId: customerId,
      });
    }

    return subscription;
  }

  async cancelSubscription(companyId) {
    const company = await Company.findByPk(companyId);
    if (!company || !company.stripeSubscriptionId) {
      return { status: 'not_found' };
    }

    const result = await this.getClient().subscriptions.cancel(company.stripeSubscriptionId);
    await company.update({ subscriptionStatus: 'cancelled' });
    return result;
  }

  async getBillingHistory(companyId) {
    try {
      const invoices = await this.getClient().invoices.list({
        limit: 10,
        customer: `cus_${companyId}`,
      });
      return invoices.data;
    } catch (error) {
      logger.warn('Unable to fetch billing history', { error: error.message });
      return [];
    }
  }
}

module.exports = new StripeService();
