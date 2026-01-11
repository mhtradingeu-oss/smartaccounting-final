const jwt = require('jsonwebtoken');
const ApiError = require('../lib/errors/apiError');

module.exports = function jwtTenantContext(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing token'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');

    if (!decoded.companyId) {
      return next(new ApiError(403, 'COMPANY_CONTEXT_REQUIRED', 'Company context required'));
    }

    req.user = {
      companyId: decoded.companyId,
      role: decoded.role || 'user',
    };

    next();
  } catch (err) {
    return next(new ApiError(401, 'TOKEN_INVALID', 'Invalid token', { original: err }));
  }
};
