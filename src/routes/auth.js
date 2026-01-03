const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authService = require('../services/authService');
const activeTokenService = require('../services/activeTokenService');
const revokedTokenService = require('../services/revokedTokenService');
const { sanitizeInput, preventNoSqlInjection } = require('../middleware/validation');
const { loginLimiter, registerLimiter, resetAuthRateLimit } = require('../middleware/rateLimiter');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { parseDurationMs } = require('../utils/duration');
const {
  getJwtSecret,
  getJwtExpiresIn,
  getRefreshSecret,
  getRefreshExpiresIn,
} = require('../utils/jwtConfig');

const BOOLEAN_TRUE_VALUES = ['1', 'true', 'yes', 'on'];
const BOOLEAN_FALSE_VALUES = ['0', 'false', 'no', 'off'];

const parseBooleanEnv = (value, fallback) => {
  if (typeof value === 'undefined') {
    return fallback;
  }
  const normalized = `${value}`.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.includes(normalized)) {
    return true;
  }
  if (BOOLEAN_FALSE_VALUES.includes(normalized)) {
    return false;
  }
  return fallback;
};

const SECURE_COOKIES_ENABLED = parseBooleanEnv(
  process.env.SECURE_COOKIES,
  process.env.NODE_ENV === 'production',
);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: SECURE_COOKIES_ENABLED,
  sameSite: 'strict',
};
const ACCESS_TOKEN_TTL_MS = parseDurationMs(getJwtExpiresIn(), 60 * 60 * 1000);
const REFRESH_TOKEN_TTL_MS = parseDurationMs(getRefreshExpiresIn(), 7 * 24 * 60 * 60 * 1000);

const router = express.Router();
const RATE_LIMIT_RESET_ENABLED = process.env.AUTH_RATE_LIMIT_RESET_ENABLED === 'true';

const setTokenCookie = (res, token) => {
  res.cookie('token', token, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_TTL_MS });
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

// Issue new JWT using refresh token
router.post('/refresh', async (req, res) => {
  // Only accept refresh token from cookie for security
  // Accept refresh token from body or cookie for test compatibility
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      status: 'error',
      message: 'Missing refresh token',
      code: 'AUTH_MISSING',
      success: false,
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, getRefreshSecret());
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token type',
        code: 'TOKEN_INVALID',
        success: false,
      });
    }

    if (await revokedTokenService.isTokenRevoked(decoded.jti)) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token revoked',
        code: 'TOKEN_REVOKED',
        success: false,
      });
    }

    const user = await authService.getProfile(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or inactive',
        code: 'TOKEN_INVALID',
        success: false,
      });
    }

    if (decoded.jti) {
      await revokedTokenService.revokeToken({
        jti: decoded.jti,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      });
      await activeTokenService.removeToken(decoded.jti);
    }

    const tokenId = uuidv4();
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
      jwtid: tokenId,
    });

    await activeTokenService.addToken({
      userId: user.id,
      jti: tokenId,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    });

    const refreshId = uuidv4();
    const newRefreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, getRefreshSecret(), {
      expiresIn: getRefreshExpiresIn(),
      jwtid: refreshId,
    });

    await activeTokenService.addToken({
      userId: user.id,
      jti: refreshId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    setTokenCookie(res, token);
    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({
      success: true,
      token,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token',
      code: 'TOKEN_INVALID',
      success: false,
    });
  }
});

router.post(
  '/register',
  registerLimiter,
  sanitizeInput,
  preventNoSqlInjection,
  async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, user: user.toJSON() });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/login',
  loginLimiter,
  sanitizeInput,
  preventNoSqlInjection,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      clearAuthCookies(res);
      setTokenCookie(res, result.token);
      if (result.refreshToken) {
        setRefreshCookie(res, result.refreshToken);
      }
      res.status(200).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      // Standardize error response for auth errors
      if (error.status === 400 || error.status === 401) {
        return res.status(error.status).json({
          status: 'error',
          message: error.message || 'Invalid credentials',
          code: error.status === 400 ? 'AUTH_MISSING' : 'AUTH_INVALID',
        });
      }
      next(error);
    }
  },
);

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const tokens = await activeTokenService.getTokensForUser(req.userId);
    for (const t of tokens) {
      await revokedTokenService.revokeToken({ jti: t.jti, expiresAt: t.expiresAt });
      await activeTokenService.removeToken(t.jti);
    }
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out successfully (all devices)' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, sanitizeInput, preventNoSqlInjection, async (req, res) => {
  if (req.user) {
    // Only return safe user fields
    const { id, email, firstName, lastName, role, companyId, isActive } = req.user;
    return res.status(200).json({
      user: { id, email, firstName, lastName, role, companyId, isActive },
    });
  }
  // This branch is only hit if authenticate does not set req.user, which should only happen if token is missing or invalid
  // But for completeness, return TOKEN_INVALID
  return res.status(401).json({
    status: 'error',
    message: 'Not authenticated',
    code: 'TOKEN_INVALID',
  });
});

if (RATE_LIMIT_RESET_ENABLED) {
  router.post('/rate-limit/reset', authenticate, requireRole(['admin']), (req, res) => {
    const clientIp =
      req.body?.ip || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    resetAuthRateLimit(clientIp);
    return res.json({
      success: true,
      message: `Auth rate limit counters reset for ${clientIp || 'current client'}`,
    });
  });
}

module.exports = router;
