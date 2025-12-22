const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, Company } = require('../models');
const { getJwtSecret, getJwtExpiresIn } = require('../utils/jwtConfig');

const ALLOWED_ROLES = ['admin', 'accountant', 'auditor', 'viewer'];

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const buildToken = (payload, jti) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn(), jwtid: jti });

const register = async (payload) => {
  const email = normalizeEmail(payload.email);

  if (!ALLOWED_ROLES.includes(payload.role)) {
    const error = new Error('Invalid role');
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const error = new Error('Email already exists');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const user = await User.create({
    ...payload,
    email,
    password: hashedPassword,
    role: payload.role,
    isActive: true,
  });

  const company = await Company.create({
    name: `${user.firstName} ${user.lastName} Company`,
    taxId: `DE${Math.floor(Math.random() * 900000000) + 100000000}`,
    address: 'Auto-generated Building 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    userId: user.id,
  });

  await user.update({ companyId: company.id });

  return user;
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.scope('withPassword').findOne({ where: { email: normalizedEmail } });

  if (!user || !user.isActive || user.isAnonymized) {
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
    { userId: user.id, role: user.role, companyId: user.companyId },
    tokenId,
  );
  // Track active token
  await activeTokenService.addToken({
    userId: user.id,
    jti: tokenId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  // Generate refresh token
  const refreshTokenId = uuidv4();
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, getJwtSecret(), {
    expiresIn: '7d',
    jwtid: refreshTokenId,
  });
  await activeTokenService.addToken({
    userId: user.id,
    jti: refreshTokenId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { token, refreshToken, user: safeUser };
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
