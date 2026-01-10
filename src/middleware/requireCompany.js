const { Company } = require('../models');
const { updateRequestContext } = require('../lib/logger/context');

const parseCompanyId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const resolveRequestedCompanyId = (req) => {
  const headerValue = req.headers?.['x-company-id'];
  const queryValue = req.query?.companyId;
  return parseCompanyId(headerValue) || parseCompanyId(queryValue);
};

const requireCompany = async (req, res, next) => {
  try {
    const requestedCompanyId = resolveRequestedCompanyId(req);
    const defaultCompanyId = req.companyId || req.user?.companyId;

    if (!requestedCompanyId && !defaultCompanyId) {
      return res.status(403).json({
        status: 'error',
        message: 'Company context is required for this resource',
        code: 'COMPANY_REQUIRED',
      });
    }

    if (requestedCompanyId && String(requestedCompanyId) !== String(defaultCompanyId)) {
      if (!req.user?.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Company access denied',
          code: 'COMPANY_FORBIDDEN',
        });
      }

      const company = await Company.findByPk(requestedCompanyId, {
        attributes: ['id', 'userId'],
        raw: true,
      });

      const isOwner = company?.userId && String(company.userId) === String(req.user.id);
      const isMember =
        req.user?.companyId && String(req.user.companyId) === String(requestedCompanyId);

      if (!company || (!isOwner && !isMember)) {
        return res.status(403).json({
          status: 'error',
          message: 'Company access denied',
          code: 'COMPANY_FORBIDDEN',
        });
      }

      req.companyId = requestedCompanyId;
      updateRequestContext({ companyId: requestedCompanyId });
      return next();
    }

    req.companyId = defaultCompanyId;
    updateRequestContext({ companyId: defaultCompanyId });
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireCompany;
