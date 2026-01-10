const { getMaintenanceState } = require('../lib/maintenanceMode');

const maintenanceMiddleware = (req, res, next) => {
  const state = getMaintenanceState();
  if (!state.enabled) {
    return next();
  }

  if (req.isSystemAdmin) {
    return next();
  }

  return res.status(503).json({
    status: 'error',
    message: 'System is in maintenance mode',
    reason: state.reason || null,
    code: 'MAINTENANCE_MODE',
  });
};

module.exports = {
  maintenanceMiddleware,
};
