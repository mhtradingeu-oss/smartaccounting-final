const { v4: uuidv4 } = require('uuid');
const { Company } = require('../models');
const promptRegistry = require('../services/ai/promptRegistry');
const { logRejected } = require('../services/ai/aiAuditLogger');
const { redactPII } = require('../services/ai/governance');

const DEFAULT_METHODS = ['GET', 'HEAD'];

function extractPrompt(req) {
  const fromQuery = typeof req.query.prompt === 'string' ? req.query.prompt : '';
  const fromBody = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
  return redactPII(fromQuery || fromBody || '');
}

async function handleRejection(req, res, { status = 403, error, reason }) {
  const prompt = extractPrompt(req);
  try {
      await logRejected({
        userId: req.user?.id,
        companyId: req.companyId,
        queryType: req.originalUrl,
        route: req.originalUrl,
        prompt,
        requestId: req.requestId,
        reason,
      });
  } catch (logError) {
    // Avoid throwing if logging fails
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('[aiRouteGuard] Audit log failure', logError.message || logError);
    }
  }
  return res.status(status).json({
    error,
    requestId: req.requestId,
  });
}

function resolvePurpose(req, defaultPurpose) {
  if (defaultPurpose) {
    return defaultPurpose;
  }
  return (
    req.query.purpose ||
    req.headers['x-ai-purpose'] ||
    (typeof req.body?.purpose === 'string' ? req.body.purpose : undefined)
  );
}

function resolvePolicyVersion(req, defaultPolicyVersion) {
  if (defaultPolicyVersion) {
    return defaultPolicyVersion;
  }
  return (
    req.query.policyVersion ||
    req.headers['x-ai-policy-version'] ||
    (typeof req.body?.policyVersion === 'string' ? req.body.policyVersion : undefined)
  );
}

function createAiRouteGuard(options = {}) {
  const {
    allowedMethods = DEFAULT_METHODS,
    requirePurpose = true,
    requirePolicyVersion = true,
    defaultPurpose,
    defaultPolicyVersion,
    rejectDisabled = true,
    skipPurposeValidation = false,
  } = options;

  return async function aiRouteGuard(req, res, next) {
    try {
      const requestId = req.requestId || req.headers['x-request-id'] || uuidv4();
      req.requestId = requestId;
      res.setHeader('X-Request-Id', requestId);

      const method = (req.method || '').toUpperCase();
      if (allowedMethods && !allowedMethods.includes(method)) {
        return handleRejection(req, res, {
          status: 501,
          error: 'AI endpoints are read-only (GET/HEAD only)',
          reason: 'Read-only guard',
        });
      }

      const user = req.user;
      const companyId = req.companyId || user?.companyId;

      if (!companyId) {
        return handleRejection(req, res, {
          status: 403,
          error: 'Company context required for AI routes',
          reason: 'Missing company context',
        });
      }

      if (!user || user.companyId !== companyId) {
        return handleRejection(req, res, {
          status: 403,
          error: 'Forbidden: invalid company context',
          reason: 'Company context mismatch',
        });
      }

      if (rejectDisabled) {
        let company = user.company;
        if (!company || typeof company.aiEnabled === 'undefined') {
          try {
            company = await Company.findByPk(companyId);
          } catch (dbErr) {
            // swallow db errors but do not continue with undefined company
            company = null;
          }
        }
        if (company && company.aiEnabled === false) {
          return handleRejection(req, res, {
            status: 501,
            error: 'AI is disabled for this company',
            reason: 'AI feature flag disabled',
          });
        }
      }

      const purpose = resolvePurpose(req, defaultPurpose);
      const policyVersion = resolvePolicyVersion(req, defaultPolicyVersion);

      if (requirePurpose && !purpose) {
        return handleRejection(req, res, {
          status: 400,
          error: 'purpose is required for AI requests',
          reason: 'Missing purpose',
        });
      }

      if (requirePolicyVersion && !policyVersion) {
        return handleRejection(req, res, {
          status: 400,
          error: 'policyVersion is required for AI requests',
          reason: 'Missing policyVersion',
        });
      }

      const meta =
        typeof promptRegistry.getPromptMeta === 'function'
          ? promptRegistry.getPromptMeta(purpose)
          : promptRegistry.get && promptRegistry.get(purpose);

      if (!meta) {
        return handleRejection(req, res, {
          status: 403,
          error: 'AI_POLICY_VIOLATION: invalid purpose or policyVersion',
          reason: 'Missing prompt meta',
        });
      }

      if (
        requirePolicyVersion &&
        !skipPurposeValidation &&
        meta.policyVersion &&
        policyVersion &&
        meta.policyVersion !== policyVersion
      ) {
        return handleRejection(req, res, {
          status: 403,
          error: 'AI_POLICY_VIOLATION: invalid purpose or policyVersion',
          reason: 'Policy version mismatch',
        });
      }

      req.aiContext = { purpose, policyVersion, meta };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = createAiRouteGuard;
