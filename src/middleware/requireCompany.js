const { updateRequestContext } = require('../lib/logger/context');
const logger = require('../lib/logger');
const { User } = require('../models');

const parseCompanyId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const resolveRequestedCompanyId = (req) => parseCompanyId(req.headers?.['x-company-id']);

const logCompanyContextFailure = ({ req, attemptedCompanyId, reason }) => {
  logger.warn('Company context rejected', {
    requestId: req.requestId,
    userId: req.userId || req.user?.id || null,
    attemptedCompanyId,
    route: req.originalUrl,
    reason,
  });
};

const createRequireCompanyMiddleware = (options = {}) => async (req, res, next) => {
  const { allowSystemAdmin = false } = options;
  try {
    const headerValue = req.headers?.['x-company-id'];
    if (headerValue === undefined || headerValue === null || headerValue === '') {
      logCompanyContextFailure({ req, attemptedCompanyId: null, reason: 'missing_header' });
      return res.status(400).json({
        status: 'error',
        message: 'x-company-id header is required',
        code: 'COMPANY_CONTEXT_REQUIRED',
      });
    }
    const requestedCompanyId = resolveRequestedCompanyId(req);
    if (!requestedCompanyId) {
      logCompanyContextFailure({ req, attemptedCompanyId: headerValue, reason: 'invalid_header' });
      return res.status(403).json({
        status: 'error',
        message: 'Company context is invalid',
        code: 'COMPANY_CONTEXT_INVALID',
      });
    }

    if (req.isSystemAdmin && !allowSystemAdmin) {
      logCompanyContextFailure({
        req,
        attemptedCompanyId: requestedCompanyId,
        reason: 'system_admin_blocked',
      });
      return res.status(403).json({
        status: 'error',
        message: 'Company context is invalid',
        code: 'COMPANY_CONTEXT_INVALID',
      });
    }

    const userId = req.userId || req.user?.id;
    if (!userId) {
      logCompanyContextFailure({ req, attemptedCompanyId: requestedCompanyId, reason: 'missing_user' });
      return res.status(403).json({
        status: 'error',
        message: 'Company context is invalid',
        code: 'COMPANY_CONTEXT_INVALID',
      });
    }

    if (!req.isSystemAdmin) {
      const user = await User.findByPk(userId, { attributes: ['id', 'companyId'] });
      if (!user || !user.companyId || String(user.companyId) !== String(requestedCompanyId)) {
        logCompanyContextFailure({
          req,
          attemptedCompanyId: requestedCompanyId,
          reason: 'company_mismatch',
        });
        return res.status(403).json({
          status: 'error',
          message: 'Company context is invalid',
          code: 'COMPANY_CONTEXT_INVALID',
        });
      }
    }

    req.companyId = requestedCompanyId;
    updateRequestContext({ companyId: requestedCompanyId });
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireCompany = (reqOrOptions, res, next) => {
  if (reqOrOptions && typeof reqOrOptions === 'object' && typeof res === 'object' && typeof next === 'function') {
    return createRequireCompanyMiddleware({})(reqOrOptions, res, next);
  }
  return createRequireCompanyMiddleware(reqOrOptions);
};

module.exports = requireCompany;
