const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const aiReadGateway = require('../services/ai/aiReadGateway');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    // Only GET, no mutation
    const requestId = req.id || req.headers['x-request-id'] || `req-${Date.now()}`;
    const companyId = req.user?.companyId || req.companyId;
    const user = req.user;
    // For this endpoint, purpose/policyVersion must be provided as query or header
    const purpose = req.query.purpose || req.headers['x-ai-purpose'];
    const policyVersion = req.query.policyVersion || req.headers['x-ai-policy-version'];
    const promptKey = 'insights_list';
    const params = { ...req.query };
    const { status, body } = await aiReadGateway({
      user,
      companyId,
      requestId,
      purpose,
      policyVersion,
      promptKey,
      params,
    });
    res.status(status).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/ai/insights/:id/decisions
const decisionValidator = require('../services/ai/decision/decisionValidator');
const decisionService = require('../services/ai/decision/decisionService');

router.post('/insights/:id/decisions', requireRole(['admin', 'accountant']), async (req, res) => {
  // 🔒 HARD READ-ONLY GUARD
  return res.status(501).json({
    feature: 'AI decision capture',
    status: 'disabled',
  });
});

// GET /api/ai/exports/insights.json
router.get('/exports/insights.json', async (req, res) => {
  try {
    const requestId = req.id || req.headers['x-request-id'] || `req-${Date.now()}`;
    const companyId = req.user?.companyId || req.companyId;
    const user = req.user;
    const purpose = req.query.purpose || req.headers['x-ai-purpose'];
    const policyVersion = req.query.policyVersion || req.headers['x-ai-policy-version'];
    const promptKey = 'insights_export_json';
    const params = { ...req.query, format: 'json' };
    const { status, body } = await aiReadGateway({
      user,
      companyId,
      requestId,
      purpose,
      policyVersion,
      promptKey,
      params,
    });
    res.status(status).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/ai/exports/insights.csv
router.get('/exports/insights.csv', async (req, res) => {
  try {
    const requestId = req.id || req.headers['x-request-id'] || `req-${Date.now()}`;
    const companyId = req.user?.companyId || req.companyId;
    const user = req.user;
    const purpose = req.query.purpose || req.headers['x-ai-purpose'];
    const policyVersion = req.query.policyVersion || req.headers['x-ai-policy-version'];
    const promptKey = 'insights_export_csv';
    const params = { ...req.query, format: 'csv' };
    const { status, body } = await aiReadGateway({
      user,
      companyId,
      requestId,
      purpose,
      policyVersion,
      promptKey,
      params,
    });
    if (status === 200 && typeof body === 'object' && body.csv) {
      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(body.csv);
    } else if (status === 200 && typeof body === 'string') {
      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(body);
    } else {
      res.status(status).json(body);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/ai/insights/generate (optional, admin/accountant only)
router.post(
  '/insights/generate',
  requireRole(['admin', 'accountant']),
  disabledFeatureHandler('AI insight generation'),
);

module.exports = router;
