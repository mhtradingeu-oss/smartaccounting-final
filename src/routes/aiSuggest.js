const express = require('express');
const { getSuggestion } = require('../services/ai/aiSuggestionService');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiRouteGuard = require('../middleware/aiRouteGuard');
const { requirePlanFeature } = require('../middleware/planGuard');
const { sendAIError } = require('../utils/aiErrorResponse');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);
router.use(requirePlanFeature('aiSuggestions'));
router.use(aiRouteGuard());

const isSuggestionsEnabled = () =>
  String(process.env.AI_SUGGESTIONS_ENABLED ?? 'false').toLowerCase() === 'true';

const respondWithError = (req, res, status, message, errorCode) =>
  sendAIError(res, {
    status,
    message,
    errorCode,
    requestId: req.requestId,
  });

router.get('/suggest', async (req, res) => {
  const { userId, companyId } = req;
  const { prompt, context } = req.query;
  try {
    if (!isSuggestionsEnabled()) {
      return respondWithError(
        req,
        res,
        501,
        'AI suggestions are not production-ready',
        'AI_SUGGEST_NOT_READY',
      );
    }
    const suggestion = await getSuggestion({
      userId,
      companyId,
      prompt,
      context,
      requestId: req.requestId,
    });
    res.json({ suggestion, requestId: req.requestId });
  } catch (err) {
    respondWithError(
      req,
      res,
      err.status || 400,
      err.message || 'Suggestion request failed',
      err.errorCode,
    );
  }
});

module.exports = router;
