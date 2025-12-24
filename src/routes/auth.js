const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const authService = require('../services/authService');
const activeTokenService = require('../services/activeTokenService');
const revokedTokenService = require('../services/revokedTokenService');
const { sanitizeInput, preventNoSqlInjection } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/security');
const { getJwtSecret, getJwtExpiresIn, getJwtExpiresMs } = require('../utils/jwtConfig');
const {
  getRefreshTokenExpiresIn,
  getRefreshTokenMaxAgeMs,
  getMaxSessionLifetimeMs,
} = require('../utils/tokenConfig');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const router = express.Router();

const ALLOWED_ROLES = ['admin', 'accountant', 'auditor', 'viewer'];

const registerValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').isString().trim().isLength({ min: 2, max: 50 }).withMessage('First name is required'),
  body('lastName').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Last name is required'),
  body('role').optional().isIn(ALLOWED_ROLES).withMessage('Invalid role'),
];

const loginValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
];

const refreshValidators = [
  body('refreshToken').optional().isString().trim().notEmpty().withMessage('Refresh token must be provided'),
];

const setTokenCookie = (res, token) => {
  res.cookie('token', token, { ...COOKIE_OPTIONS, maxAge: getJwtExpiresMs() });
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: getRefreshTokenMaxAgeMs(),
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

// Issue new JWT using refresh token
router.post('/refresh', validateRequest(refreshValidators), async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Missing refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, getJwtSecret());
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    const tokenJti = decoded.jti || null;
    if (tokenJti && (await revokedTokenService.isTokenRevoked(tokenJti))) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const sessionStartIso = decoded.sessionStart || (decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null);
    if (sessionStartIso) {
      const sessionStartMs = new Date(sessionStartIso).getTime();
      if (Number.isFinite(sessionStartMs) && Date.now() - sessionStartMs > getMaxSessionLifetimeMs()) {
        return res.status(401).json({
          success: false,
          message: 'Session expired; please log in again',
        });
      }
    }

    const user = await authService.getProfile(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const tokenId = uuidv4();
    const sessionStartForTokens = sessionStartIso || new Date().toISOString();
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId,
        sessionStart: sessionStartForTokens,
      },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn(), jwtid: tokenId },
    );

    await activeTokenService.addToken({
      userId: user.id,
      jti: tokenId,
      expiresAt: new Date(Date.now() + getJwtExpiresMs()),
    });

    if (tokenJti) {
      await revokedTokenService.revokeToken({
        jti: tokenJti,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      });
      await activeTokenService.removeToken(tokenJti);
    }

    const refreshTokenId = uuidv4();
    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        sessionStart: sessionStartForTokens,
      },
      getJwtSecret(),
      {
        expiresIn: getRefreshTokenExpiresIn(),
        jwtid: refreshTokenId,
      },
    );

    await activeTokenService.addToken({
      userId: user.id,
      jti: refreshTokenId,
      expiresAt: new Date(Date.now() + getRefreshTokenMaxAgeMs()),
    });

    setTokenCookie(res, token);
    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({ success: true, token, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

router.post(
  '/register',
  registerLimiter,
  sanitizeInput,
  preventNoSqlInjection,
  validateRequest(registerValidators),
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
  validateRequest(loginValidators),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      clearAuthCookies(res);
      setTokenCookie(res, result.token);
      if (result.refreshToken) {
        setRefreshCookie(res, result.refreshToken);
      }
      res.status(200).json({ success: true, user: result.user, token: result.token });
    } catch (error) {
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
    return res.status(200).json({ success: true, user: req.user });
  }
  return res.status(401).json({ success: false, message: 'Not authenticated' });
});

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    component: 'auth',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
