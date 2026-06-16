module.exports = function requireSystemAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'system_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};
