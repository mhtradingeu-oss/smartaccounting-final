const { getMaintenanceState } = require('../lib/maintenanceMode');
const ApiError = require('../lib/errors/apiError');

const maintenanceMiddleware = (req, res, next) => {
  const state = getMaintenanceState();
  if (!state.enabled) {
    return next();
  }

  if (req.isSystemAdmin) {
    return next();
  }

  return next(
    new ApiError(503, 'MAINTENANCE_MODE', 'System is in maintenance mode', {
      reason: state.reason || null,
    }),
  );
};

module.exports = {
  maintenanceMiddleware,
};
