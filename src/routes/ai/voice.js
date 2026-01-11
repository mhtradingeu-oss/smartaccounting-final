const express = require('express');
const { authenticate, requireCompany } = require('../../middleware/authMiddleware');
const aiAssistantService = require('../../services/ai/aiAssistantService');
const aiReadGateway = require('../../services/ai/aiReadGateway');
const { logRejected } = require('../../services/ai/aiAuditLogger');
const aiRouteGuard = require('../../middleware/aiRouteGuard');
const rateLimit = require('../../middleware/aiRateLimit');
const { Company } = require('../../models');
const { isAssistantRoleAllowed } = require('../../services/ai/assistantAuthorization');
const { sendAIError } = require('../../utils/aiErrorResponse');

const router = express.Router();

const normalizeFlag = (value) => String(value ?? '').toLowerCase() === 'true';
const isAssistantFeatureEnabled = () =>
  normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');
const isVoiceFeatureEnabled = () => normalizeFlag(process.env.AI_VOICE_ENABLED ?? 'false');
const isTtsFeatureEnabled = () => normalizeFlag(process.env.AI_TTS_ENABLED ?? 'false');

const respondWithError = (req, res, status, message, errorCode) =>
  sendAIError(res, {
    status,
    message,
    errorCode,
    requestId: req.requestId,
  });

const respondVoiceRoleDenied = (req, res) =>
  respondWithError(req, res, 403, 'Insufficient role for AI assistant', 'AI_ASSISTANT_FORBIDDEN');

const respondVoiceDisabled = (req, res) =>
  respondWithError(req, res, 403, 'AI Voice is disabled', 'AI_VOICE_DISABLED');

const normalizeResponseMode = (value) => (value === 'voice' ? 'voice' : 'text');

const buildSafeVoiceSummary = () => ({
  message:
    'Summary only: Voice output is restricted for this request. Review the full response in text mode.',
  highlights: [],
  references: [],
});

async function resolveCompany(companyId, user) {
  if (user?.company && typeof user.company.ttsEnabled !== 'undefined') {
    return user.company;
  }
  return Company.findByPk(companyId, { attributes: ['id', 'ttsEnabled'] });
}

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

router.use(authenticate);
router.use(requireCompany);
router.use((req, _res, next) => {
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript : '';
  const intent = typeof req.body?.intent === 'string' ? req.body.intent : '';
  if (transcript) {
    req.query.prompt = transcript;
  }
  if (intent) {
    req.query.queryType = `assistant_voice_${intent}`;
  }
  next();
});
router.use(aiRouteGuard({ allowedMethods: ['POST'] }));
router.use(rateLimit);

router.post('/assistant', async (req, res, next) => {
  try {
    const { intent, targetInsightId, sessionId } = req.body || {};
    const rawPrompt =
      typeof req.body?.transcript === 'string'
        ? req.body.transcript
        : typeof req.body?.prompt === 'string'
          ? req.body.prompt
          : '';
    const fallbackPrompt = rawPrompt || aiAssistantService.INTENT_LABELS[intent] || intent || '';
    const prompt = fallbackPrompt;
    const requestedResponseMode = normalizeResponseMode(req.body?.responseMode);
    const companyId = req.companyId;
    const queryType = `assistant_voice_${intent || 'unknown'}`;
    let responseMode = requestedResponseMode;
    let voiceFallback = false;

    if (!isAssistantFeatureEnabled() || !isVoiceFeatureEnabled()) {
      return respondVoiceDisabled(req, res);
    }
    if (!intent) {
      return respondWithError(req, res, 400, 'intent is required', 'BAD_REQUEST');
    }
    if (!aiAssistantService.INTENT_LABELS[intent]) {
      return respondWithError(req, res, 400, 'Intent not supported', 'BAD_REQUEST');
    }
    if (!isAssistantRoleAllowed(req.user.role)) {
      try {
        await logRejected({
          userId: req.user?.id,
          companyId,
          requestId: req.requestId,
          queryType,
          route: req.originalUrl,
          prompt,
          reason: 'Role not permitted for AI voice assistant',
          responseMode: requestedResponseMode,
        });
      } catch (logError) {
        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.error('[ai/voice] Audit log failure', logError.message || logError);
        }
      }
      return respondVoiceRoleDenied(req, res);
    }
    if (requestedResponseMode === 'voice') {
      const isAdmin = req.user.role === 'admin';
      const ttsEnabled = isAdmin && isTtsFeatureEnabled();
      const company = ttsEnabled ? await resolveCompany(companyId, req.user) : null;
      const canUseVoice = !!(ttsEnabled && company?.ttsEnabled);
      if (!canUseVoice) {
        responseMode = 'text';
        voiceFallback = true;
      }
    }
    const { status, body } = await aiReadGateway(
      buildGatewayPayload({
        req,
        prompt,
        queryType,
        params: { intent, targetInsightId, sessionId, responseMode, prompt },
        handler: async ({ companyId: scopedCompanyId }) => {
          if (voiceFallback) {
            return buildSafeVoiceSummary();
          }
          const context = await aiAssistantService.getContext(scopedCompanyId);
          return aiAssistantService.answerIntentCompliance({
            intent,
            context,
            targetInsightId,
            prompt,
          });
        },
        responseMeta: { sessionId, targetInsightId, voiceFallback },
        sessionId,
        responseMode,
      }),
    );
    if (status !== 200) {
      return respondWithError(
        req,
        res,
        status,
        body?.message || body?.error || 'AI request failed',
        body?.errorCode,
      );
    }
    res.json({ answer: body?.data || null, requestId: req.requestId, responseMode });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
