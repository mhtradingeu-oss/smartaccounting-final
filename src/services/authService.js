const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, Company } = require('../models');
const { parseDurationMs } = require('../utils/duration');
const {
  getJwtSecret,
  getJwtExpiresIn,
  getRefreshSecret,
  getRefreshExpiresIn,
} = require('../utils/jwtConfig');

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const buildToken = (payload, jti) =>
  // Always include userId, role, companyId, iat, exp, jti in payload
  jwt.sign(
    {
      ...payload,
      // iat, exp, jti are set by jwt.sign options below
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn(),
      jwtid: jti,
    },
  );

const ACCESS_TOKEN_TTL_MS = parseDurationMs(getJwtExpiresIn(), 60 * 60 * 1000);
const REFRESH_TOKEN_TTL_MS = parseDurationMs(getRefreshExpiresIn(), 7 * 24 * 60 * 60 * 1000);

/**
 * ⚠️ Registration is disabled in production by default
 * Enable only if schema is aligned
 */

const register = async (data) => {
  // Only allow registration in non-production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV !== 'development') {
        const error = new Error('Registration is disabled in production');
        error.status = 403;
        throw error;
      }
    }
  }
  const { email, password, firstName, lastName, role = 'viewer', companyId } = data || {};
  if (!email || !password || !firstName || !lastName) {
    const error = new Error();
    error.status = 400;
    throw error;
  }
  const normalizedEmail = normalizeEmail(email);
  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    const error = new Error('Email already registered');
    error.status = 400;
    throw error;
  }
  let finalCompanyId = companyId;
  // Auto-assign test company if not in production and no companyId provided
  if (process.env.NODE_ENV !== 'production' && !finalCompanyId) {
    const TEST_COMPANY_TAX_ID = 'TEST_COMPANY_TAX_ID';
    let testCompany = await Company.findOne({ where: { taxId: TEST_COMPANY_TAX_ID } });
    if (!testCompany) {
      testCompany = await Company.create({
        name: 'Test Company',
        taxId: TEST_COMPANY_TAX_ID,
        address: '1 Test Lane',
        city: 'Testville',
        postalCode: '00000',
        country: 'Testland',
      });
    }
    finalCompanyId = testCompany.id;
  }
  const hashRounds = 10;
  const hashedPassword = await bcrypt.hash(password, hashRounds);
  const user = await User.create({
    email: normalizedEmail,
    password: hashedPassword,
    firstName,
    lastName,
    role,
    companyId: typeof finalCompanyId !== 'undefined' ? finalCompanyId : null,
  });
  if (process.env.NODE_ENV !== 'production') {
    // Defensive logging in dev/test only
    // eslint-disable-next-line no-console
    console.log(
      '[authService] Registered user:',
      normalizedEmail,
      'role:',
      role,
      'companyId:',
      user.companyId,
    );
  }
  return user;
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await User.scope('withPassword').findOne({
    where: { email: normalizedEmail },
  });

  if (!user || user.isActive === false) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.password || '');
  if (!isValid) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const safeUser = user.toJSON();
  delete safeUser.password;

  const activeTokenService = require('./activeTokenService');

  const tokenId = uuidv4();
  const token = buildToken(
    {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      // iat, exp, jti will be set by jwt.sign
    },
    tokenId,
  );

  await activeTokenService.addToken({
    userId: user.id,
    jti: tokenId,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
  });

  const refreshTokenId = uuidv4();
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, getRefreshSecret(), {
    expiresIn: getRefreshExpiresIn(),
    jwtid: refreshTokenId,
  });

  await activeTokenService.addToken({
    userId: user.id,
    jti: refreshTokenId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return {
    token,
    refreshToken,
    user: safeUser,
  };
};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
};

module.exports = {
  register,
  login,
  getProfile,
};
