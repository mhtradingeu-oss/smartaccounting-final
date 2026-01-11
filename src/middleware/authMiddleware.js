// Authentication/authorization middleware source of truth for protected routes.
const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');
const ApiError = require('../lib/errors/apiError');
const requireCompany = require('./requireCompany');
const revokedTokenService = require('../services/revokedTokenService');
const { getJwtSecret } = require('../utils/jwtConfig');
const { updateRequestContext } = require('../lib/logger/context');

const isSystemAdminUser = (user) =>
  Boolean(
    user && user.role === 'admin' && (user.companyId === null || user.companyId === undefined),
  );

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  // Enforce strict Bearer token usage
  if (!authHeader.startsWith('Bearer ')) {
    return next(
      new ApiError(
        401,
        'AUTH_MISSING',
        'Authorization header must be in the format: Bearer <token>',
      ),
    );
  }
  const token = authHeader.slice(7);
  if (!token) {
    return next(new ApiError(401, 'AUTH_MISSING', 'Authentication credentials are missing'));
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.tokenPayload = decoded;
    req.tokenCompanyId = decoded.companyId || null;
    const tokenJti = decoded.jti || null;
    const tokenExp = decoded.exp ? new Date(decoded.exp * 1000) : null;
    if (tokenJti && (await revokedTokenService.isTokenRevoked(tokenJti))) {
      return next(new ApiError(401, 'TOKEN_REVOKED', 'Token has been revoked'));
    }
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Company, as: 'company' }],
    });
    if (!user || !user.isActive) {
      return next(new ApiError(401, 'TOKEN_INVALID', 'Invalid authentication token'));
    }
    req.user = user;
    req.userId = user.id;
    req.isSystemAdmin = isSystemAdminUser(user);
    updateRequestContext({ userId: user.id });
    req.token = token;
    req.tokenJti = tokenJti;
    req.tokenExp = tokenExp;
    // Temporary debug logging for test environment only
    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console
      console.debug(
        '[authMiddleware][TEST] Authenticated user:',
        'userId:',
        user.id,
        'companyId:',
        user.companyId,
      );
    }
    next();
  } catch (error) {
    // Distinguish between expired and invalid tokens
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'TOKEN_INVALID', 'Token expired'));
    }
    return next(new ApiError(401, 'TOKEN_INVALID', 'Invalid token', { original: error }));
  }
};

const requireRole =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!allowedRoles.length) {
      return next();
    }
    if (!req.user) {
      return next(new ApiError(403, 'INSUFFICIENT_ROLE', 'Insufficient permissions'));
    }
    // Hierarchical roles: admin > accountant > auditor > viewer
    const roleHierarchy = ['viewer', 'auditor', 'accountant', 'admin'];
    const userRoleIdx = roleHierarchy.indexOf(req.user.role);
    // Accept if user is admin or matches/above required role
    const isAllowed = Array.isArray(allowedRoles)
      ? allowedRoles.some((r) => userRoleIdx >= roleHierarchy.indexOf(r))
      : userRoleIdx >= roleHierarchy.indexOf(allowedRoles);
    if (!isAllowed) {
      return next(new ApiError(403, 'INSUFFICIENT_ROLE', 'Insufficient permissions'));
    }
    next();
  };

const requireSystemAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(403, 'INSUFFICIENT_ROLE', 'Insufficient permissions'));
  }
  if (!isSystemAdminUser(req.user)) {
    return next(new ApiError(403, 'SYSTEM_ADMIN_REQUIRED', 'System admin access required'));
  }
  return next();
};

// Legacy aliases used by some routes
const authorize = (roles) => requireRole(Array.isArray(roles) ? roles : roles ? [roles] : []);
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticate,
  requireRole,
  requireSystemAdmin,
  isSystemAdminUser,
  authorize,
  requireAdmin,
  requireCompany,
};
