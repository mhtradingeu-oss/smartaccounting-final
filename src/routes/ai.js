const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const aiReadGateway = require('../services/ai/aiReadGateway');
const aiRouteGuard = require('../middleware/aiRouteGuard');
const aiReadOnlyRouter = require('./aiReadOnly');
const voiceRouter = require('./ai/voice');
const governanceRouter = require('./ai/governance');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// Mount read-only, governance, and voice endpoints before general AI read routes.
router.use('/read', aiReadOnlyRouter);
router.use('/governance', governanceRouter);
router.use('/voice', voiceRouter);

const respondWithError = (req, res, status, error) => {
  return res.status(status).json({ error, requestId: req.requestId });
};

const respondMutationDisabled = (featureName) => (req, res) =>
  respondWithError(req, res, 501, `${featureName} is disabled`);

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
readRouter.use(aiRouteGuard());

const mergeRequestId = (body, requestId) => {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...body, requestId: body.requestId || requestId };
  }
  return body;
};

async function proxyAiGatewayCall(req, promptKey, params = {}) {
  const { user, companyId, requestId, aiContext } = req;
  const { status, body } = await aiReadGateway({
    user,
    companyId,
    requestId,
    purpose: aiContext?.purpose,
    policyVersion: aiContext?.policyVersion,
    promptKey,
    params,
  });
  return {
    status,
    body: mergeRequestId(body, requestId),
  };
}

readRouter.get('/insights', async (req, res) => {
  try {
    const params = { ...req.query };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_list', params);
    return res.status(status).json(body);
  } catch (err) {
    return respondWithError(req, res, 500, err.message || 'Internal server error');
  }
});

readRouter.get('/exports/insights.json', async (req, res) => {
  try {
    const params = { ...req.query, format: 'json' };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_export_json', params);
    return res.status(status).json(body);
  } catch (err) {
    return respondWithError(req, res, 500, err.message || 'Internal server error');
  }
});

readRouter.get('/exports/insights.csv', async (req, res) => {
  try {
    const params = { ...req.query, format: 'csv' };
    const { status, body } = await proxyAiGatewayCall(req, 'insights_export_csv', params);
    if (status === 200) {
      res.setHeader('Content-Type', 'text/csv');
      if (typeof body === 'string') {
        return res.status(200).send(body);
      }
      if (body && typeof body === 'object' && body.csv) {
        return res.status(200).send(body.csv);
      }
    }
    return res.status(status).json(body);
  } catch (err) {
    return respondWithError(req, res, 500, err.message || 'Internal server error');
  }
});

router.use('/', readRouter);

module.exports = router;
