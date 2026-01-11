const { sanitizePayload, containsNoSqlOperators } = require('../utils/security');
const ApiError = require('../lib/errors/apiError');

const sanitizeInput = (req, res, next) => {
  req.body = sanitizePayload(req.body);
  next();
};

const preventNoSqlInjection = (req, res, next) => {
  const sources = [req.body, req.query, req.params];
  const payload = sources.find((source) => containsNoSqlOperators(source));

  if (payload) {
    return next(new ApiError(400, 'BAD_REQUEST', 'Invalid request payload'));
  }

  next();
};

module.exports = {
  sanitizeInput,
  preventNoSqlInjection,
};
