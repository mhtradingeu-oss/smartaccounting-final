const logger = require('../lib/logger');
const errorHandler = require('../middleware/errorHandler');

// Thin bridge for legacy imports; prefer requiring from src/middleware/errorHandler directly.
module.exports = {
  logger,
  errorHandler,
};
