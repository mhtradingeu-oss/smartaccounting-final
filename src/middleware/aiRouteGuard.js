const { v4: uuidv4 } = require('uuid');
const { Company } = require('../models');
const ApiError = require('../lib/errors/apiError');
const DEFAULT_METHODS = ['GET', 'HEAD'];

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

function aiRouteGuard(options = {}) {
  const {
    allowedMethods = DEFAULT_METHODS,
    requirePurpose = true,
    requirePolicyVersion = true,
    defaultPurpose,
    defaultPolicyVersion,
    rejectDisabled = true,
    skipPurposeValidation = false,
  } = options;

  return async function (req, res, next) {
    try {
      const requestId = req.requestId || req.headers['x-request-id'] || uuidv4();
      req.requestId = requestId;
      res.setHeader('X-Request-Id', requestId);

      const method = (req.method || '').toUpperCase();
      if (allowedMethods && !allowedMethods.includes(method)) {
        return next(
          new ApiError(
            405,
            'METHOD_NOT_ALLOWED',
            'This endpoint does not support the requested method',
          ),
        );
      }

      const user = req.user;
      const companyId = req.companyId;

      if (!companyId) {
        return next(
          new ApiError(403, 'COMPANY_CONTEXT_REQUIRED', 'Company context required for AI routes'),
        );
      }

      if (!user || !companyId) {
        return next(
          new ApiError(403, 'COMPANY_CONTEXT_INVALID', 'Forbidden: invalid company context'),
        );
      }

      if (rejectDisabled) {
        let company = user.company;
        if (!company || typeof company.aiEnabled === 'undefined') {
          try {
            company = await Company.findByPk(companyId);
          } catch (dbErr) {
            company = null;
          }
        }
        if (company && company.aiEnabled === false) {
          return next(new ApiError(501, 'AI_NOT_ENABLED', 'AI is disabled for this company'));
        }
      }

      if (['viewer', 'auditor'].includes(user.role)) {
        return next(
          new ApiError(403, 'AI_ASSISTANT_FORBIDDEN', 'Insufficient role for AI assistant'),
        );
      }

      const purpose = resolvePurpose(req, defaultPurpose);
      const policyVersion = resolvePolicyVersion(req, defaultPolicyVersion);

      if (requirePurpose && !purpose) {
        return next(
          new ApiError(400, 'AI_PURPOSE_REQUIRED', 'AI calls require purpose and policyVersion'),
        );
      }

      if (requirePolicyVersion && !policyVersion) {
        return next(
          new ApiError(400, 'AI_PURPOSE_REQUIRED', 'AI calls require purpose and policyVersion'),
        );
      }

      req.aiContext = { purpose, policyVersion };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function disabledFeatureHandler(req, res, next) {
  return next(new ApiError(501, 'AI_FEATURE_DISABLED', 'This AI feature is disabled'));
}

module.exports = { aiRouteGuard, disabledFeatureHandler };
