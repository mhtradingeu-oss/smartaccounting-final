const { updateRequestContext } = require('../lib/logger/context');

const CROSS_TENANT_KEYS = ['companyId', 'company_id', 'tenantId', 'tenant_id'];

const findTenantMismatch = (companyId, source = {}) => {
  for (const key of CROSS_TENANT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value) !== String(companyId)) {
        return { key, value };
      }
    }
  }
  return null;
};

const requireCompany = (req, res, next) => {
  const companyId = req.companyId || req.user?.companyId;

  if (!companyId) {
    return res.status(403).json({
      status: 'error',
      message: 'Company context is required for this resource',
      code: 'COMPANY_REQUIRED',
    });
  }

  const mismatch =
    findTenantMismatch(companyId, req.params) ||
    findTenantMismatch(companyId, req.body) ||
    findTenantMismatch(companyId, req.query);

  if (mismatch) {
    return res.status(403).json({
      status: 'error',
      message: `Cross-tenant reference detected in ${mismatch.key}`,
      code: 'CROSS_TENANT_VIOLATION',
    });
  }

  req.companyId = companyId;
  updateRequestContext({ companyId });
  next();
};

module.exports = requireCompany;
