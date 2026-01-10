const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiDataService = require('../services/ai/aiDataService');
const aiAssistantService = require('../services/ai/aiAssistantService');
const { logSessionEvent } = require('../services/ai/aiAuditLogger');
const aiReadGateway = require('../services/ai/aiReadGateway');
const aiRouteGuard = require('../middleware/aiRouteGuard');
const rateLimit = require('../middleware/aiRateLimit');
const { randomUUID } = require('crypto');
const { redactPII } = require('../services/ai/governance');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);
router.use(aiRouteGuard());
router.use(rateLimit);

const normalizeFlag = (value) => String(value ?? '').toLowerCase() === 'true';
const isAssistantFeatureEnabled = normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');

const respondWithError = (req, res, status, error) =>
  res.status(status).json({ error, requestId: req.requestId });

const respondAssistantDisabled = (req, res) =>
  respondWithError(req, res, 501, 'AI Assistant is disabled');

const extractPromptFromQuery = (req) =>
  typeof req.query.prompt === 'string' ? req.query.prompt : '';

const safePromptFromRequest = (prompt) => redactPII(prompt || '');

const buildGatewayPayload = ({
  req,
  prompt,
  queryType,
  handler,
  params,
  responseMeta,
  sessionId,
  responseMode,
}) => ({
  user: req.user,
  companyId: req.user?.companyId || req.companyId,
  requestId: req.requestId,
  purpose: req.aiContext?.purpose,
  policyVersion: req.aiContext?.policyVersion,
  prompt,
  params,
  handler,
  audit: {
    route: req.originalUrl,
    queryType,
    responseMeta,
    sessionId,
    responseMode,
  },
});

// GET /api/ai/read/invoice-summary?invoiceId=...  (companyId from req.user)
router.get('/invoice-summary', async (req, res, next) => {
  try {
    const { invoiceId } = req.query;
    const prompt = extractPromptFromQuery(req);
    const companyId = req.user.companyId;
    const queryType = 'invoice_summary';
    if (!companyId) {
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { invoiceId, prompt },
        handler: ({ companyId: scopedCompanyId }) =>
          aiDataService.getInvoiceSummary(scopedCompanyId, invoiceId),
        responseMeta: { invoiceId },
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    res.json({ summary: body?.data || null, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/monthly-overview?month=YYYY-MM
router.get('/monthly-overview', async (req, res, next) => {
  try {
    const { month } = req.query;
    const prompt = extractPromptFromQuery(req);
    const companyId = req.user.companyId;
    const queryType = 'monthly_overview';
    if (!companyId) {
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { month, prompt },
        handler: ({ companyId: scopedCompanyId }) =>
          aiDataService.getMonthlyOverview(scopedCompanyId, month),
        responseMeta: { month },
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    res.json({ overview: body?.data || null, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/read/reconciliation-summary?range=YYYY-MM-DD_to_YYYY-MM-DD
router.get('/reconciliation-summary', async (req, res, next) => {
  try {
    const { range } = req.query;
    const prompt = extractPromptFromQuery(req);
    const companyId = req.user.companyId;
    const queryType = 'reconciliation_summary';
    if (!companyId) {
      return respondWithError(req, res, 403, 'companyId required');
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return respondWithError(req, res, 400, 'Query not allowed');
    }
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { range, prompt },
        handler: ({ companyId: scopedCompanyId }) =>
          aiDataService.getReconciliationSummary(scopedCompanyId, range),
        responseMeta: { range },
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    res.json({ summary: body?.data || null, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/assistant/context', async (req, res, next) => {
  if (!isAssistantFeatureEnabled) {
    return respondAssistantDisabled(req, res);
  }
  try {
    const prompt = extractPromptFromQuery(req);
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType: 'assistant_context',
        params: { prompt },
        handler: ({ companyId }) => aiAssistantService.getContext(companyId),
        responseMeta: { contextLoaded: true },
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    res.json({ context: body?.data || null, requestId: req.requestId });
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
    const rawPrompt = typeof req.query.prompt === 'string' ? req.query.prompt : '';
    const fallbackPrompt = rawPrompt || aiAssistantService.INTENT_LABELS[intent] || intent || '';
    const prompt = fallbackPrompt;
    const sessionId = req.query.sessionId;
    const queryType = `assistant_${intent || 'unknown'}`;
    if (!intent) {
      return respondWithError(req, res, 400, 'intent is required');
    }
    if (!aiAssistantService.INTENT_LABELS[intent]) {
      return respondWithError(req, res, 400, 'Intent not supported');
    }
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { intent, targetInsightId, prompt },
        handler: async ({ companyId: scopedCompanyId }) => {
          const context = await aiAssistantService.getContext(scopedCompanyId);
          return aiAssistantService.answerIntent({ intent, context, targetInsightId });
        },
        responseMeta: { sessionId, targetInsightId },
        sessionId,
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    res.json({ answer: body?.data || null, requestId: req.requestId });
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
    const queryType = 'assistant_session';
    const sessionId = randomUUID();
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { prompt },
        handler: async () => ({ sessionId }),
        responseMeta: { sessionId },
        sessionId,
        responseMode: 'session',
      }),
    );
    if (status !== 200) {
      return respondWithError(req, res, status, body?.error || body?.message || 'AI request failed');
    }
    await logSessionEvent({
      userId: req.user?.id,
      companyId,
      _requestId: req.requestId,
      sessionId,
      event: 'started',
      route: req.originalUrl,
      prompt: safePrompt,
    });
    res.json({ sessionId, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
