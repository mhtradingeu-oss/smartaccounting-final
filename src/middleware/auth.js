// Thin alias for legacy imports; prefer requiring ./authMiddleware directly.
const authMiddleware = require('./authMiddleware');

module.exports = {
  ...authMiddleware,
  authenticateToken: authMiddleware.authenticate,
  auth: authMiddleware.authenticate,
  authorize: authMiddleware.requireRole,
};
