const USER_ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
};

const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

const TAX_RATES = {
  DEFAULT_VAT: 0.19,
  REDUCED_VAT: 0.07,
};

const FILE_UPLOAD = {
  MAX_SIZE: 10_485_760,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  UPLOAD_DIR: 'uploads',
};

const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
};

const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
};

module.exports = {
  USER_ROLES,
  SUBSCRIPTION_PLANS,
  TAX_RATES,
  FILE_UPLOAD,
  API_STATUS,
  AUDIT_ACTIONS,
};
