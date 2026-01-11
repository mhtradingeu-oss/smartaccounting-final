const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const aiDataService = require('../services/ai/aiDataService');
const aiAssistantService = require('../services/ai/aiAssistantService');
const { logRejected, logSessionEvent } = require('../services/ai/aiAuditLogger');
const aiReadGateway = require('../services/ai/aiReadGateway');
const { aiRouteGuard } = require('../middleware/aiRouteGuard');
const rateLimit = require('../middleware/aiRateLimit');
const { requireAssistantPlan } = require('../middleware/aiPlanGuards');
const { requirePlanFeature } = require('../middleware/planGuard');
const { randomUUID } = require('crypto');
const { redactPII } = require('../services/ai/governance');
const { isAssistantRoleAllowed } = require('../services/ai/assistantAuthorization');
const ApiError = require('../lib/errors/apiError');

const router = express.Router();

// Global middlewares
router.use(authenticate);
router.use(requireCompany);
router.use(requirePlanFeature('aiRead'));
router.use(rateLimit);

const normalizeFlag = (value) => String(value ?? '').toLowerCase() === 'true';
const isAssistantFeatureEnabled = normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');
const MAX_PROMPT_LENGTH = 8000;

// Error helpers using ApiError only
const respondAssistantDisabled = (req, res, next) =>
  next(new ApiError(501, 'AI_ASSISTANT_DISABLED', 'AI Assistant is disabled'));

const respondAssistantRoleDenied = (req, res, next) =>
  next(new ApiError(403, 'AI_ASSISTANT_FORBIDDEN', 'Insufficient role for AI assistant'));

const respondPromptInUrl = (req, res, next) =>
  next(new ApiError(400, 'PROMPT_IN_URL', 'Prompt must be sent in the request body'));

const respondInputTooLarge = (req, res, next) =>
  next(new ApiError(413, 'INPUT_TOO_LARGE', 'Prompt exceeds maximum length'));

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
  companyId: req.companyId,
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
    const companyId = req.companyId;
    const queryType = 'invoice_summary';
    if (!companyId) {
      return next(new ApiError(403, 'COMPANY_CONTEXT_REQUIRED', 'companyId required'));
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return next(new ApiError(400, 'BAD_REQUEST', 'Query not allowed'));
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
      return next(
        new ApiError(
          status,
          body?.errorCode || 'AI_REQUEST_FAILED',
          body?.message || body?.error || 'AI request failed',
        ),
      );
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
    const companyId = req.companyId;
    const queryType = 'monthly_overview';
    if (!companyId) {
      return next(new ApiError(403, 'COMPANY_CONTEXT_REQUIRED', 'companyId required'));
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return next(new ApiError(400, 'BAD_REQUEST', 'Query not allowed'));
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
      return next(
        new ApiError(
          status,
          body?.errorCode || 'AI_REQUEST_FAILED',
          body?.message || body?.error || 'AI request failed',
        ),
      );
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
    const companyId = req.companyId;
    const queryType = 'reconciliation_summary';
    if (!companyId) {
      return next(new ApiError(403, 'COMPANY_CONTEXT_REQUIRED', 'companyId required'));
    }
    if (!aiDataService.isAllowedQuery(queryType)) {
      return next(new ApiError(400, 'BAD_REQUEST', 'Query not allowed'));
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
      return next(
        new ApiError(
          status,
          body?.errorCode || 'AI_REQUEST_FAILED',
          body?.message || body?.error || 'AI request failed',
        ),
      );
    }
    res.json({ summary: body?.data || null, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/assistant/context', requireAssistantPlan, async (req, res, next) => {
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
      return next(
        new ApiError(
          status,
          body?.errorCode || 'AI_REQUEST_FAILED',
          body?.message || body?.error || 'AI request failed',
        ),
      );
    }
    res.json({ context: body?.data || null, requestId: req.requestId });
  } catch (err) {
    next(err);
  }
});

router.get('/assistant', requireAssistantPlan, (req, res, next) => {
  return next(
    new ApiError(405, 'METHOD_NOT_ALLOWED', 'POST is required for AI assistant requests'),
  );
});

router.post(
  '/assistant',
  requireAssistantPlan,
  aiRouteGuard({ allowedMethods: ['POST'] }),
  async (req, res, next) => {
    if (!isAssistantFeatureEnabled) {
      return respondAssistantDisabled(req, res, next);
    }
    try {
      if (typeof req.query.prompt === 'string' && req.query.prompt.length > 0) {
        return respondPromptInUrl(req, res, next);
      }
      const { intent, targetInsightId, sessionId } = req.body || {};
      const rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
      if (rawPrompt && rawPrompt.length > MAX_PROMPT_LENGTH) {
        return respondInputTooLarge(req, res, next);
      }
      const fallbackPrompt = rawPrompt || aiAssistantService.INTENT_LABELS[intent] || intent || '';
      const prompt = fallbackPrompt;
      const queryType = `assistant_${intent || 'unknown'}`;
      if (!isAssistantRoleAllowed(req.user?.role)) {
        const safePrompt = redactPII(rawPrompt || '');
        try {
          await logRejected({
            userId: req.user?.id,
            companyId: req.companyId,
            requestId: req.requestId,
            queryType,
            route: req.originalUrl,
            prompt: safePrompt,
            reason: 'Role not permitted for AI assistant',
          });
        } catch (logError) {
          if (process.env.NODE_ENV !== 'test') {
            // eslint-disable-next-line no-console
            console.error('[ai/read] Audit log failure', logError.message || logError);
          }
        }
        return respondAssistantRoleDenied(req, res, next);
      }
      if (!intent) {
        return next(new ApiError(400, 'BAD_REQUEST', 'intent is required'));
      }
      if (!aiAssistantService.INTENT_LABELS[intent]) {
        return next(new ApiError(400, 'BAD_REQUEST', 'Intent not supported'));
      }
      const { status, body } = await aiReadGateway(
        buildGatewayPayload({
          req,
          prompt,
          queryType,
          params: { intent, targetInsightId, prompt },
          handler: async ({ companyId: scopedCompanyId }) => {
            const context = await aiAssistantService.getContext(scopedCompanyId);
            return aiAssistantService.answerIntentCompliance({
              intent,
              context,
              targetInsightId,
              prompt,
            });
          },
          responseMeta: { sessionId, targetInsightId },
          sessionId,
        }),
      );
      if (status !== 200) {
        return next(
          new ApiError(
            status,
            body?.errorCode || 'AI_REQUEST_FAILED',
            body?.message || body?.error || 'AI request failed',
          ),
        );
      }
      res.json({ answer: body?.data || null, requestId: req.requestId });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/assistant/stream',
  requireAssistantPlan,
  aiRouteGuard({ allowedMethods: ['POST'] }),
  async (req, res, next) => {
    if (!isAssistantFeatureEnabled) {
      return respondAssistantDisabled(req, res);
    }
    try {
      if (typeof req.query.prompt === 'string' && req.query.prompt.length > 0) {
        return respondPromptInUrl(req, res);
      }
      const { intent, targetInsightId, sessionId } = req.body || {};
      const rawPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
      if (rawPrompt && rawPrompt.length > MAX_PROMPT_LENGTH) {
        return respondInputTooLarge(req, res);
      }
      const fallbackPrompt = rawPrompt || aiAssistantService.INTENT_LABELS[intent] || intent || '';
      const prompt = fallbackPrompt;
      const queryType = `assistant_${intent || 'unknown'}`;
      if (!isAssistantRoleAllowed(req.user?.role)) {
        const safePrompt = redactPII(rawPrompt || '');
        try {
          await logRejected({
            userId: req.user?.id,
            companyId: req.companyId,
            requestId: req.requestId,
            queryType,
            route: req.originalUrl,
            prompt: safePrompt,
            reason: 'Role not permitted for AI assistant',
          });
        } catch (logError) {
          if (process.env.NODE_ENV !== 'test') {
            // eslint-disable-next-line no-console
            console.error('[ai/read] Audit log failure', logError.message || logError);
          }
        }
        return respondAssistantRoleDenied(req, res);
      }
      if (!intent) {
        return next(new ApiError(400, 'BAD_REQUEST', 'intent is required'));
      }
      if (!aiAssistantService.INTENT_LABELS[intent]) {
        return next(new ApiError(400, 'BAD_REQUEST', 'Intent not supported'));
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      // Skip flushHeaders in test environment as mocked responses don't support internal Node.js buffer structures
      if (
        typeof res.flushHeaders === 'function' &&
        process.env.NODE_ENV !== 'test' &&
        process.env.JEST_WORKER_ID === undefined
      ) {
        try {
          res.flushHeaders();
        } catch (_) {
          // ignore in test/mocked environments
        }
      }

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify({ ...data, requestId: req.requestId })}\n\n`);
      };

      const { status, body } = await aiReadGateway(
        buildGatewayPayload({
          req,
          prompt,
          queryType,
          params: { intent, targetInsightId, prompt },
          handler: async ({ companyId: scopedCompanyId }) => {
            const context = await aiAssistantService.getContext(scopedCompanyId);
            return aiAssistantService.answerIntentCompliance({
              intent,
              context,
              targetInsightId,
              prompt,
            });
          },
          responseMeta: { sessionId, targetInsightId, stream: true },
          sessionId,
        }),
      );

      if (status !== 200) {
        const errorCode =
          body?.errorCode === 'METHOD_NOT_ALLOWED'
            ? 'AI_READ_ONLY'
            : body?.errorCode || 'AI_STREAM_ERROR';
        sendEvent('error', {
          errorCode,
          message:
            errorCode === 'AI_READ_ONLY'
              ? 'AI is in read-only mode'
              : body?.message || body?.error || 'AI request failed',
        });
        sendEvent('done', {});
        return res.end();
      }

      const message = body?.data?.message || '';
      const chunks = message.match(/.{1,60}/g) || [''];
      chunks.forEach((chunk, index) => {
        sendEvent('chunk', { token: chunk, index });
      });
      sendEvent('done', {});
      return res.end();
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        try {
          process.stderr.write(`STREAM_ERROR_STACK:${(err && err.stack) || String(err)}\n`);
        } catch {
          // intentionally ignored
        }
      }
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      const message = err?.message || 'AI stream failed';
      res.write('event: error\n');
      res.write(
        `data: ${JSON.stringify({
          errorCode: err?.errorCode || 'AI_STREAM_ERROR',
          message,
          requestId: req.requestId,
        })}\n\n`,
      );
      res.write('event: done\n');
      res.write(`data: ${JSON.stringify({ requestId: req.requestId })}\n\n`);
      res.end();
    }
  },
);

router.get('/session', requireAssistantPlan, async (req, res, next) => {
  if (!isAssistantFeatureEnabled) {
    return respondAssistantDisabled(req, res);
  }
  try {
    const prompt = extractPromptFromQuery(req);
    const safePrompt = safePromptFromRequest(prompt);
    const companyId = req.companyId;
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
      return next(
        new ApiError(
          status,
          body?.errorCode || 'AI_REQUEST_FAILED',
          body?.message || body?.error || 'AI request failed',
        ),
      );
    }
    await logSessionEvent({
      userId: req.user?.id,
      companyId,
      requestId: req.requestId,
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
