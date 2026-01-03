const express = require('express');
const { getSuggestion } = require('../services/ai/aiSuggestionService');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiRouteGuard = require('../middleware/aiRouteGuard');

const router = express.Router();

const respondWithError = (req, res, status, error) =>
  res.status(status).json({ error, requestId: req.requestId });

router.use(authenticate, requireCompany, aiRouteGuard());

router.get('/suggest', async (req, res) => {
  const { userId, companyId } = req;
  const { prompt, context } = req.query;
  try {
    const suggestion = await getSuggestion({ userId, companyId, prompt, context });
    res.json({ suggestion, requestId: req.requestId });
  } catch (err) {
    respondWithError(req, res, err.status || 400, err.message || 'Suggestion request failed');
  }
});

module.exports = router;
