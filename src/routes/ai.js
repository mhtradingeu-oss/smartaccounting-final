const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const aiReadGateway = require('../services/ai/aiReadGateway');
const { aiRouteGuard } = require('../middleware/aiRouteGuard');
const aiInsightsService = require('../services/ai/aiInsightsService');
const aiReadOnlyRouter = require('./aiReadOnly');
const voiceRouter = require('./ai/voice');
const governanceRouter = require('./ai/governance');
const { requirePlanFeature } = require('../middleware/planGuard');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// Mount read-only, governance, and voice endpoints before general AI read routes.
router.use('/read', aiReadOnlyRouter);
router.use('/governance', governanceRouter);
router.use('/voice', voiceRouter);

const ApiError = require('../lib/errors/apiError');

const respondMutationDisabled = (featureName) => (req, res, next) =>
  next(new ApiError(501, 'AI_MUTATION_DISABLED', `${featureName} is disabled`));

router.post(
  '/insights/:id/decisions',
  requireRole(['admin', 'accountant']),
  respondMutationDisabled('AI decision capture'),
);

router.post(
  '/insights/generate',
  requireRole(['admin', 'accountant']),
  respondMutationDisabled('AI insight generation'),
);

const readRouter = express.Router();
readRouter.use(requirePlanFeature('aiInsights'));
readRouter.use(aiRouteGuard());

const mergeRequestId = (body, requestId) => {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...body, requestId: body.requestId || requestId };
  }
  return body;
};

async function proxyAiGatewayCall(req, promptKey, params = {}) {
  const { user, companyId, requestId, aiContext } = req;
  const viewerLimited = ['viewer', 'auditor'].includes(user?.role);
  const handlers = {
    insights_list: async ({ companyId: scopedCompanyId }) => {
      const insights = await aiInsightsService.listInsightsForClient(scopedCompanyId, params);
      const limitedInsights = viewerLimited ? insights.slice(0, 5) : insights;
      return {
        insights: limitedInsights,
        viewerLimited,
        totalCount: insights.length,
      };
    },
    insights_export_json: async ({ companyId: scopedCompanyId }) =>
      aiInsightsService.exportInsights(scopedCompanyId, 'json'),
    insights_export_csv: async ({ companyId: scopedCompanyId }) =>
      aiInsightsService.exportInsights(scopedCompanyId, 'csv'),
  };
  const handler = handlers[promptKey];
  const { status, body } = await aiReadGateway({
    user,
    companyId,
    requestId,
    purpose: aiContext?.purpose,
    policyVersion: aiContext?.policyVersion,
    promptKey,
    params,
    handler,
    audit: {
      route: req.originalUrl,
      queryType: promptKey,
    },
  });
  return {
    status,
    body: mergeRequestId(body, requestId),
  };
}

readRouter.get('/insights', async (req, res, next) => {
  try {
    const params = { ...req.query };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_list', params);
    return res.status(status).json(body);
  } catch (err) {
    return next(new ApiError(500, 'INTERNAL_ERROR', err.message || 'Internal server error'));
  }
});

readRouter.get('/exports/insights.json', async (req, res, next) => {
  try {
    const params = { ...req.query, format: 'json' };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_export_json', params);
    if (status !== 200) {
      return next(
        new ApiError(status, body?.errorCode || 'AI_HANDLER_ERROR', body?.message || 'AI error'),
      );
    }
    return res.status(200).json(body);
  } catch (err) {
    return next(new ApiError(500, 'INTERNAL_ERROR', err.message || 'Internal server error'));
  }
});

readRouter.get('/exports/insights.csv', async (req, res, next) => {
  try {
    const params = { ...req.query, format: 'csv' };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_export_csv', params);
    if (status === 200) {
      res.setHeader('Content-Type', 'text/csv');
      const csvPayload =
        typeof body === 'string' ? body : body?.csv || body?.data || body?.data?.csv;
      if (typeof csvPayload === 'string') {
        return res.status(200).send(csvPayload);
      }
    }
    return next(
      new ApiError(status, body?.errorCode || 'AI_HANDLER_ERROR', body?.message || 'AI error'),
    );
  } catch (err) {
    return next(new ApiError(500, 'INTERNAL_ERROR', err.message || 'Internal server error'));
  }
});

router.use('/', readRouter);

module.exports = router;
