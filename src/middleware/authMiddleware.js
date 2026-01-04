// Authentication/authorization middleware source of truth for protected routes.
const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');
const requireCompany = require('./requireCompany');
const revokedTokenService = require('../services/revokedTokenService');
const { getJwtSecret } = require('../utils/jwtConfig');
const { updateRequestContext } = require('../lib/logger/context');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  // Enforce strict Bearer token usage
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authorization header must be in the format: Bearer <token>',
      code: 'AUTH_MISSING',
    });
  }
  const token = authHeader.slice(7);
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication credentials are missing',
      code: 'AUTH_MISSING',
    });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.tokenPayload = decoded;
    req.tokenCompanyId = decoded.companyId || null;
    const tokenJti = decoded.jti || null;
    const tokenExp = decoded.exp ? new Date(decoded.exp * 1000) : null;
    if (tokenJti && (await revokedTokenService.isTokenRevoked(tokenJti))) {
      return res.status(401).json({
        status: 'error',
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
    }
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Company, as: 'company' }],
    });
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID',
      });
    }
    req.user = user;
    req.userId = user.id;
    req.companyId = user.companyId;
    updateRequestContext({ userId: user.id, companyId: user.companyId });
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
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_INVALID',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      code: 'TOKEN_INVALID',
    });
  }
};

const requireRole =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!allowedRoles.length) {
      return next();
    }
    if (!req.user) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
      });
    }
    // Hierarchical roles: admin > accountant > auditor > viewer
    const roleHierarchy = ['viewer', 'auditor', 'accountant', 'admin'];
    const userRoleIdx = roleHierarchy.indexOf(req.user.role);
    // Accept if user is admin or matches/above required role
    const isAllowed = Array.isArray(allowedRoles)
      ? allowedRoles.some((r) => userRoleIdx >= roleHierarchy.indexOf(r))
      : userRoleIdx >= roleHierarchy.indexOf(allowedRoles);
    if (!isAllowed) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
      });
    }
    next();
  };

// Legacy aliases used by some routes
const authorize = (roles) => requireRole(Array.isArray(roles) ? roles : roles ? [roles] : []);
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticate,
  requireRole,
  authorize,
  requireAdmin,
  requireCompany,
};
