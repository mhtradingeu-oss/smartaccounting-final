const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authService = require('../services/authService');
const activeTokenService = require('../services/activeTokenService');
const revokedTokenService = require('../services/revokedTokenService');
const { sanitizeInput, preventNoSqlInjection } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/authMiddleware');
const { getJwtSecret, getJwtExpiresIn } = require('../utils/jwtConfig');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const router = express.Router();

const setTokenCookie = (res, token) => {
  res.cookie('token', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

// Issue new JWT using refresh token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Missing refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, getJwtSecret());
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    if (await revokedTokenService.isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const user = await authService.getProfile(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const tokenId = uuidv4();
    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.companyId },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn(), jwtid: tokenId },
    );

    await activeTokenService.addToken({
      userId: user.id,
      jti: tokenId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    setTokenCookie(res, token);
    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

router.post('/register', registerLimiter, sanitizeInput, preventNoSqlInjection, async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, user: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

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

module.exports = router;
