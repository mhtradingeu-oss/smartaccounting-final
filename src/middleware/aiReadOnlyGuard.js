// Middleware to enforce GET-only for AI read-only endpoints
module.exports = function aiReadOnlyGuard(req, res, next) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'AI endpoints are read-only (GET only)' });
  }
  next();
};
