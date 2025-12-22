const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiDataService = require('../services/ai/aiDataService');
const { logRequested, logResponded, logRejected, logRateLimited } = require('../services/ai/aiAuditLogger');
const aiReadOnlyGuard = require('../middleware/aiReadOnlyGuard');
const rateLimit = require('../middleware/aiRateLimit');
const { detectMutationIntent } = require('../services/ai/mutationIntent');

const router = express.Router();

// Enforce GET-only, authentication, company scoping, and rate limiting
router.use(authenticate, requireCompany, aiReadOnlyGuard, rateLimit);

async function rejectIfMutationIntent({ userId, companyId, queryType, route, prompt }, res) {
  const intent = detectMutationIntent(prompt);
  if (!intent.detected) {
    return false;
  }
  await logRejected({
    userId,
    companyId,
    queryType,
    route,
    prompt,
    reason: intent.reason,
  });
  res.status(400).json({ error: 'Mutation intent detected. AI is advisory only.' });
  return true;
}

// GET /api/ai/read/invoice-summary?invoiceId=...  (companyId from req.user)
router.get('/invoice-summary', async (req, res, next) => {
  try {
    const { invoiceId, prompt } = req.query;
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'invoice_summary';
    if (!companyId) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Missing companyId' });
      return res.status(403).json({ error: 'companyId required' });
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Query not allowed' });
      return res.status(400).json({ error: 'Query not allowed' });
    }
    if (await rejectIfMutationIntent({ userId, companyId, queryType, route, prompt }, res)) {
      return;
    }
    await logRequested({ userId, companyId, queryType, route, prompt });
    const summary = await aiDataService.getInvoiceSummary(companyId, invoiceId);
    await logResponded({ userId, companyId, queryType, route, prompt, responseMeta: { insightCount: summary ? 1 : 0 } });
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/monthly-overview?month=YYYY-MM
router.get('/monthly-overview', async (req, res, next) => {
  try {
    const { month, prompt } = req.query;
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'monthly_overview';
    if (!companyId) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Missing companyId' });
      return res.status(403).json({ error: 'companyId required' });
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Query not allowed' });
      return res.status(400).json({ error: 'Query not allowed' });
    }
    if (await rejectIfMutationIntent({ userId, companyId, queryType, route, prompt }, res)) {
      return;
    }
    await logRequested({ userId, companyId, queryType, route, prompt });
    const overview = await aiDataService.getMonthlyOverview(companyId, month);
    await logResponded({ userId, companyId, queryType, route, prompt, responseMeta: { insightCount: overview ? 1 : 0 } });
    res.json({ overview });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/reconciliation-summary?range=YYYY-MM-DD_to_YYYY-MM-DD
router.get('/reconciliation-summary', async (req, res, next) => {
  try {
    const { range, prompt } = req.query;
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'reconciliation_summary';
    if (!companyId) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Missing companyId' });
      return res.status(403).json({ error: 'companyId required' });
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({ userId, companyId, queryType, route, prompt, reason: 'Query not allowed' });
      return res.status(400).json({ error: 'Query not allowed' });
    }
    if (await rejectIfMutationIntent({ userId, companyId, queryType, route, prompt }, res)) {
      return;
    }
    await logRequested({ userId, companyId, queryType, route, prompt });
    const summary = await aiDataService.getReconciliationSummary(companyId, range);
    await logResponded({ userId, companyId, queryType, route, prompt, responseMeta: { insightCount: summary ? 1 : 0 } });
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
