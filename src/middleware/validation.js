const { sanitizePayload, containsNoSqlOperators } = require('../utils/security');

const sanitizeInput = (req, res, next) => {
  req.body = sanitizePayload(req.body);
  next();
};

const preventNoSqlInjection = (req, res, next) => {
  const sources = [req.body, req.query, req.params];
  const payload = sources.find((source) => containsNoSqlOperators(source));

  if (payload) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request payload',
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  preventNoSqlInjection,
};
