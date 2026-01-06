const permissions = require('./permissions');

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
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_MISSING',
      });
    }

    const rolePerms = permissions[role];
    if (!rolePerms) {
      return res.status(403).json({
        status: 'error',
        message: 'Role not allowed',
        code: 'ROLE_UNKNOWN',
      });
    }

    if (rolePerms.allow.includes('*')) {
      return next();
    }

    const method = req.method;
    const path = normalizePath(req.baseUrl + req.path);

    const allowed = rolePerms.allow.some((rule) => matchRule(rule, method, path));

    if (!allowed) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
};

module.exports = permissionGuard;
