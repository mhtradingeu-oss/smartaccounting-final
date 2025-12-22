const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const aiInsightsService = require('../services/ai/aiInsightsService');
const { Company } = require('../models');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// GET /api/v1/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company.aiEnabled) {return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });}
    const insights = await aiInsightsService.listInsights(req.companyId);
    res.json({ insights });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/ai/insights/:id/decisions
router.post('/insights/:id/decisions', async (req, res) => {
  try {
    const { decision, reason } = req.body;
    const actorUser = req.user;
    try {
      const decisionObj = await aiInsightsService.decideInsight(req.companyId, req.params.id, actorUser, decision, reason);
      res.json({ success: true, decision: decisionObj });
    } catch (err) {
      // If error has status, use it, else 500
      res.status(err.status || 500).json({ error: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/ai/exports/insights.json
router.get('/exports/insights.json', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company.aiEnabled) {return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });}
    const data = await aiInsightsService.exportInsights(req.companyId, 'json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/ai/exports/insights.csv
router.get('/exports/insights.csv', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company.aiEnabled) {return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });}
    const data = await aiInsightsService.exportInsights(req.companyId, 'csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/ai/insights/generate (optional, admin/accountant only)
router.post('/insights/generate', requireRole(['admin', 'accountant']), async (req, res) => {
  try {
    // context: { invoices, expenses, ... } (should be fetched in real impl)
    const company = await Company.findByPk(req.companyId);
    if (!company.aiEnabled) {return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });}
    // For demo: require context in body
    const context = req.body;
    const insights = await aiInsightsService.generateInsightsForCompany(req.companyId, context);
    res.json({ success: true, insights });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
