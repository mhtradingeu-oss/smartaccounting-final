const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const { aiRouteGuard } = require('../middleware/aiRouteGuard');
const { requirePlanFeature } = require('../middleware/planGuard');
const ApiError = require('../lib/errors/apiError');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);
router.use(requirePlanFeature('aiSuggestions'));
router.use(aiRouteGuard());

const respondNotReady = (req, res, next) => {
  // Always return 501 for disabled feature
  return next(new ApiError(501, 'AI_SUGGEST_NOT_READY', 'AI suggestions are not production-ready'));
};

router.get('/', respondNotReady);
router.get('', respondNotReady);
router.get('*', respondNotReady);

module.exports = router;
