const { updateRequestContext } = require('../lib/logger/context');

const requireCompany = (req, res, next) => {
  const companyId = req.companyId || req.user?.companyId;

  if (!companyId) {
    return res.status(403).json({
      status: 'error',
      message: 'Company context is required for this resource',
      code: 'COMPANY_REQUIRED',
    });
  }

  req.companyId = companyId;
  updateRequestContext({ companyId });
  next();
};

module.exports = requireCompany;
