const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiDataService = require('../services/ai/aiDataService');
const aiAssistantService = require('../services/ai/aiAssistantService');
const {
  logRequested,
  logResponded,
  logRejected,
  logSessionEvent,
} = require('../services/ai/aiAuditLogger');

const aiRouteGuard = require('../middleware/aiRouteGuard');
const rateLimit = require('../middleware/aiRateLimit');
const { detectMutationIntent } = require('../services/ai/mutationIntent');
const { randomUUID } = require('crypto');
const { getPromptMeta } = require('../services/ai/promptRegistry');
const { redactPII } = require('../services/ai/governance');

const router = express.Router();

const normalizeFlag = (value) => String(value ?? '').toLowerCase() === 'true';
const isAssistantFeatureEnabled = normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');

const respondWithError = (req, res, status, error) =>
  res.status(status).json({ error, requestId: req.requestId });

const respondAssistantDisabled = (req, res) =>
  respondWithError(req, res, 501, 'AI Assistant is disabled');

const extractPromptFromQuery = (req) =>
  typeof req.query.prompt === 'string' ? req.query.prompt : '';

const safePromptFromRequest = (prompt) => redactPII(prompt || '');

// Enforce GET-only, authentication, company scoping, and rate limiting
router.use(authenticate, requireCompany, aiRouteGuard(), rateLimit);

async function rejectIfMutationIntent({
  userId,
  companyId,
  queryType,
  route,
  prompt,
  safePrompt,
  requestId,
  req,
  res,
}) {
  const intent = detectMutationIntent(prompt);
  if (!intent.detected) {
    return false;
  }
  await logRejected({
    userId,
    companyId,
    queryType,
    route,
    prompt: safePrompt,
    requestId,
    reason: intent.reason,
  });
  respondWithError(req, res, 400, 'Mutation intent detected. AI is advisory only.');
  return true;
}

// GET /api/ai/read/invoice-summary?invoiceId=...  (companyId from req.user)
router.get('/invoice-summary', async (req, res, next) => {
  try {
    const { invoiceId } = req.query;
    const prompt = extractPromptFromQuery(req);
    const safePrompt = safePromptFromRequest(prompt);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'invoice_summary';
    const requestId = req.requestId;
    if (!companyId) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Missing companyId',
      });
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Query not allowed',
      });
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    if (
      await rejectIfMutationIntent({
        userId,
        companyId,
        queryType,
        route,
        prompt,
        safePrompt,
        requestId,
        req,
        res,
      })
    ) {
      return;
    }
    const meta = getPromptMeta(queryType);
    let hasLoggedRequest = false;
    const ensureLogRequested = async (extra = {}) => {
      if (hasLoggedRequest) {
        return;
      }
      hasLoggedRequest = true;
      // logRequested is only called via ensureLogRequested
      await logRequested({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        ...extra,
        meta,
      });
    };
    await ensureLogRequested();
    const summary = await aiDataService.getInvoiceSummary(companyId, invoiceId);
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { insightCount: summary ? 1 : 0 },
    });
    res.json({ summary, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/monthly-overview?month=YYYY-MM
router.get('/monthly-overview', async (req, res, next) => {
  try {
    const { month } = req.query;
    const prompt = extractPromptFromQuery(req);
    const safePrompt = safePromptFromRequest(prompt);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'monthly_overview';
    const requestId = req.requestId;
    if (!companyId) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Missing companyId',
      });
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Query not allowed',
      });
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    if (
      await rejectIfMutationIntent({
        userId,
        companyId,
        queryType,
        route,
        prompt,
        safePrompt,
        requestId,
        req,
        res,
      })
    ) {
      return;
    }
    const meta = getPromptMeta(queryType);
    let hasLoggedRequest = false;
    const ensureLogRequested = async (extra = {}) => {
      if (hasLoggedRequest) {
        return;
      }
      hasLoggedRequest = true;
      await logRequested({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        ...extra,
        meta,
      });
    };
    await ensureLogRequested();
    const overview = await aiDataService.getMonthlyOverview(companyId, month);
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { insightCount: overview ? 1 : 0 },
    });
    res.json({ overview, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/reconciliation-summary?range=YYYY-MM-DD_to_YYYY-MM-DD
router.get('/reconciliation-summary', async (req, res, next) => {
  try {
    const { range } = req.query;
    const prompt = extractPromptFromQuery(req);
    const safePrompt = safePromptFromRequest(prompt);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'reconciliation_summary';
    const requestId = req.requestId;
    if (!companyId) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Missing companyId',
      });
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Query not allowed',
      });
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    if (
      await rejectIfMutationIntent({
        userId,
        companyId,
        queryType,
        route,
        prompt,
        safePrompt,
        requestId,
        req,
        res,
      })
    ) {
      return;
    }
    const meta = getPromptMeta(queryType);
    let hasLoggedRequest = false;
    const ensureLogRequested = async (extra = {}) => {
      if (hasLoggedRequest) {
        return;
      }
      hasLoggedRequest = true;
      await logRequested({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        ...extra,
        meta,
      });
    };
    await ensureLogRequested();
    const summary = await aiDataService.getReconciliationSummary(companyId, range);
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { insightCount: summary ? 1 : 0 },
    });
    res.json({ summary, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/assistant/context', async (req, res, next) => {
  if (!isAssistantFeatureEnabled) {
    return respondAssistantDisabled(req, res);
  }
  try {
    const context = await aiAssistantService.getContext(req.companyId);
    res.json({ context, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/assistant', async (req, res, next) => {
  if (!isAssistantFeatureEnabled) {
    return respondAssistantDisabled(req, res);
  }
  try {
    const { intent, targetInsightId } = req.query;
    const rawPrompt =
      typeof req.query.prompt === 'string' ? req.query.prompt : '';
    const fallbackPrompt =
      rawPrompt || aiAssistantService.INTENT_LABELS[intent] || intent || '';
    const prompt = fallbackPrompt;
    const safePrompt = safePromptFromRequest(prompt);
    const sessionId = req.query.sessionId;
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = `assistant_${intent || 'unknown'}`;
    const requestId = req.requestId;
    if (!intent) {
      return respondWithError(req, res, 400, 'intent is required');
    }
    if (!aiAssistantService.INTENT_LABELS[intent]) {
      return respondWithError(req, res, 400, 'Intent not supported');
    }
    const context = await aiAssistantService.getContext(companyId);
    const meta = getPromptMeta(queryType);
    let hasLoggedRequest = false;
    const ensureLogRequested = async (extra = {}) => {
      if (hasLoggedRequest) {
        return;
      }
      hasLoggedRequest = true;
      await logRequested({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        ...extra,
        meta,
      });
    };
    await ensureLogRequested({
      responseMeta: { sessionId, targetInsightId },
      sessionId,
    });
    const answer = aiAssistantService.answerIntent({ intent, context, targetInsightId });
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { sessionId, targetInsightId },
      sessionId,
    });
    res.json({ answer, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/session', async (req, res, next) => {
  if (!isAssistantFeatureEnabled) {
    return respondAssistantDisabled(req, res);
  }
  try {
    const prompt = extractPromptFromQuery(req);
    const safePrompt = safePromptFromRequest(prompt);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = 'assistant_session';
    const requestId = req.requestId;
    const sessionId = randomUUID();
    const meta = getPromptMeta(queryType);
    let hasLoggedRequest = false;
    const ensureLogRequested = async (extra = {}) => {
      if (hasLoggedRequest) {
        return;
      }
      hasLoggedRequest = true;
      await logRequested({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        ...extra,
        meta,
      });
    };
    await ensureLogRequested({ responseMeta: { sessionId }, sessionId });
    await logSessionEvent({
      userId,
      companyId,
      requestId,
      sessionId,
      event: 'started',
      route,
      prompt: safePrompt,
    });
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { sessionId },
      sessionId,
    });
    res.json({ sessionId, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
