const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const aiInsightsService = require('../services/ai/aiInsightsService');
const { Company } = require('../models');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (company.aiEnabled === false) {
      return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });
    }
    const insights = await aiInsightsService.listInsights(req.companyId);
    const viewerMode = req.user?.role === 'viewer';
    const limitedInsights = viewerMode ? insights.slice(0, 3) : insights;
    res.json({
      insights: limitedInsights,
      viewerLimited: viewerMode,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/ai/insights/:id/decisions
router.post('/insights/:id/decisions', disabledFeatureHandler('AI decision capture'));

// GET /api/ai/exports/insights.json
router.get('/exports/insights.json', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (company.aiEnabled === false) {
      return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });
    }
    const data = await aiInsightsService.exportInsights(req.companyId, 'json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/ai/exports/insights.csv
router.get('/exports/insights.csv', async (req, res) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (company.aiEnabled === false) {
      return res.status(501).json({ status: 'disabled', feature: 'AI Insights' });
    }
    const data = await aiInsightsService.exportInsights(req.companyId, 'csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/ai/insights/generate (optional, admin/accountant only)
router.post(
  '/insights/generate',
  requireRole(['admin', 'accountant']),
  disabledFeatureHandler('AI insight generation'),
);

module.exports = router;
