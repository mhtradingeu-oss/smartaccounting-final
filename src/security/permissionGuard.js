const permissions = require('./permissions');
const ApiError = require('../lib/errors/apiError');

const normalizePath = (path) => {
  return path.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/gi, '/:id');
};

const matchRule = (rule, method, path) => {
  const [ruleMethod, rulePath] = rule.split(' ');
  if (ruleMethod !== '*' && ruleMethod !== method) {
    return false;
  }

  if (rulePath === '*') {
    return true;
  }

  if (rulePath.endsWith('/*')) {
    return path.startsWith(rulePath.slice(0, -2));
  }

  return rulePath === path;
};

const permissionGuard = () => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return next(new ApiError(401, 'AUTH_MISSING', 'Authentication required'));
    }

    const rolePerms = permissions[role];
    if (!rolePerms) {
      return next(new ApiError(403, 'ROLE_UNKNOWN', 'Role not allowed'));
    }

    if (rolePerms.allow.includes('*')) {
      return next();
    }

    const method = String(req.method || '').toUpperCase();
    const rawPath =
      typeof req.originalUrl === 'string' && req.originalUrl.length
        ? req.originalUrl.split('?')[0]
        : `${req.baseUrl || ''}${req.path || ''}`;
    const path = normalizePath(rawPath);

    const allowed = rolePerms.allow.some((rule) => matchRule(rule, method, path));

    if (!allowed) {
      return next(new ApiError(403, 'PERMISSION_DENIED', 'Access denied'));
    }

    next();
  };
};

module.exports = permissionGuard;
