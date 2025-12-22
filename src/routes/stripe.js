const express = require('express');
const StripeService = require('../services/stripeService');
const { Company, User } = require('../models');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/responseHelpers');
const logger = require('../lib/logger');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

router.use(disabledFeatureHandler('Stripe billing'));

const ensureStripeConfigured = (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return sendError(res, 'Stripe is not configured. Please set STRIPE_SECRET_KEY.', 503);
  }
  return next();
};

router.get('/health', (req, res) => {
  return sendSuccess(res, 'Stripe health', {
    configured: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString(),
  });
});

router.get('/plans', authenticate, async (req, res) => {
  try {
    const plans = await StripeService.getPricingPlans();
    return sendSuccess(res, 'Pricing plans retrieved', { plans });
  } catch (error) {
    logger.error('Failed to fetch Stripe plans', { error: error.message });
    return sendError(res, 'Unable to fetch plans', 500);
  }
});

router.use(authenticate);
router.use(requireCompany);

router.get('/subscription', ensureStripeConfigured, async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    const subscription = await StripeService.getSubscriptionStatus(company.id);
    return sendSuccess(res, 'Subscription status retrieved', { subscription });
  } catch (error) {
    logger.error('Failed to fetch subscription', { error: error.message });
    return sendError(res, 'Failed to fetch subscription', 500);
  }
});

router.post('/create-subscription', ensureStripeConfigured, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return sendError(res, 'Plan ID is required', 400);
    }

    const company = await Company.findByPk(req.companyId);
    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    const subscription = await StripeService.createSubscription(company.id, planId, req.userId);
    return sendSuccess(res, 'Subscription created', { subscription });
  } catch (error) {
    logger.error('Subscription creation failed', { error: error.message });
    return sendError(res, error.message || 'Failed to create subscription', 500);
  }
});

router.post('/cancel-subscription', ensureStripeConfigured, async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    const cancellation = await StripeService.cancelSubscription(company.id);
    return sendSuccess(res, 'Subscription cancelled', { cancellation });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error: error.message });
    return sendError(res, error.message || 'Failed to cancel subscription', 500);
  }
});

router.get('/billing-history', ensureStripeConfigured, async (req, res) => {
  try {
    const history = await StripeService.getBillingHistory(req.companyId);
    return sendSuccess(res, 'Billing history retrieved', { history });
  } catch (error) {
    logger.error('Failed to fetch billing history', { error: error.message });
    return sendError(res, 'Failed to fetch billing history', 500);
  }
});

router.post('/create-customer', ensureStripeConfigured, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    const company = await Company.findByPk(req.companyId);

    if (!user || !company) {
      return sendError(res, 'Company or user not found', 404);
    }

    if (company.stripeCustomerId) {
      return sendSuccess(res, 'Customer already exists', {
        customerId: company.stripeCustomerId,
      });
    }

    const customer = await StripeService.createCustomer(company, user);
    return sendSuccess(res, 'Stripe customer created', { customer });
  } catch (error) {
    logger.error('Failed to create Stripe customer', { error: error.message });
    return sendError(res, error.message || 'Failed to create customer', 500);
  }
});

module.exports = router;
