const DEFAULT_ENABLED = String(process.env.MAINTENANCE_MODE || 'false').toLowerCase() === 'true';

const state = {
  enabled: DEFAULT_ENABLED,
  reason: process.env.MAINTENANCE_REASON || '',
  updatedAt: new Date().toISOString(),
};

const getMaintenanceState = () => ({ ...state });

const setMaintenanceState = ({ enabled, reason }) => {
  state.enabled = Boolean(enabled);
  state.reason = reason ? String(reason).trim() : '';
  state.updatedAt = new Date().toISOString();
  return getMaintenanceState();
};

module.exports = {
  getMaintenanceState,
  setMaintenanceState,
};
