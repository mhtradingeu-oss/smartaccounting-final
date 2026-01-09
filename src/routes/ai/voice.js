const express = require('express');
const { authenticate, requireCompany } = require('../../middleware/authMiddleware');
const aiAssistantService = require('../../services/ai/aiAssistantService');
const { logRequested, logResponded, logRejected } = require('../../services/ai/aiAuditLogger');
const aiRouteGuard = require('../../middleware/aiRouteGuard');
const rateLimit = require('../../middleware/aiRateLimit');
const { detectMutationIntent } = require('../../services/ai/mutationIntent');
const { getPromptMeta } = require('../../services/ai/promptRegistry');
const { redactPII } = require('../../services/ai/governance');
const { Company } = require('../../models');

const router = express.Router();

const normalizeFlag = (value) => String(value ?? '').toLowerCase() === 'true';
const isAssistantFeatureEnabled = () =>
  normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');
const isVoiceFeatureEnabled = () => normalizeFlag(process.env.AI_VOICE_ENABLED ?? 'false');
const isTtsFeatureEnabled = () => normalizeFlag(process.env.AI_TTS_ENABLED ?? 'false');
const ALLOWED_ROLES = new Set(['admin', 'accountant']);

const respondWithError = (req, res, status, error) =>
  res.status(status).json({ error, requestId: req.requestId });

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
    const safePrompt = redactPII(prompt || '');
    const requestedResponseMode = normalizeResponseMode(req.body?.responseMode);
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const route = req.originalUrl;
    const queryType = `assistant_voice_${intent || 'unknown'}`;
    const requestId = req.requestId;
    let responseMode = requestedResponseMode;
    let voiceFallback = false;

    if (!isAssistantFeatureEnabled() || !isVoiceFeatureEnabled()) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'AI voice disabled',
        responseMode: requestedResponseMode,
      });
      return respondWithError(req, res, 403, 'AI Voice is disabled');
    }
    if (!intent) {
      return respondWithError(req, res, 400, 'intent is required');
    }
    if (!aiAssistantService.INTENT_LABELS[intent]) {
      return respondWithError(req, res, 400, 'Intent not supported');
    }
    if (!ALLOWED_ROLES.has(req.user.role)) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: 'Role not permitted for voice assistant',
        responseMode: requestedResponseMode,
      });
      return respondWithError(req, res, 403, 'Insufficient role for voice assistant');
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
    const mutationIntent = detectMutationIntent(prompt);
    if (mutationIntent.detected) {
      await logRejected({
        userId,
        companyId,
        queryType,
        route,
        prompt: safePrompt,
        requestId,
        reason: mutationIntent.reason,
        responseMode,
      });
      return respondWithError(req, res, 400, 'Mutation intent detected. AI is advisory only.');
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
        responseMode,
      });
    };
    await ensureLogRequested({
      responseMeta: { sessionId, targetInsightId, voiceFallback },
      sessionId,
    });
    const answer = voiceFallback
      ? buildSafeVoiceSummary()
      : aiAssistantService.answerIntent({ intent, context, targetInsightId });
    await logResponded({
      userId,
      companyId,
      queryType,
      route,
      prompt: safePrompt,
      requestId,
      meta,
      responseMeta: { sessionId, targetInsightId, voiceFallback },
      sessionId,
      responseMode,
    });
    res.json({ answer, requestId: req.requestId, responseMode });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
