const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getJwtSecret, getJwtExpiresIn } = require('./jwtConfig');

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() },
  );
};

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
};

const formatUserResponse = (user, includeCompany = false) => {
  const response = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    companyId: user.companyId,
    isActive: user.isActive,
  };

  if (includeCompany && user.company) {
    response.company = {
      id: user.company.id,
      name: user.company.name,
      type: user.company.type,
      subscriptionPlan: user.company.subscriptionPlan,
      subscriptionStatus: user.company.subscriptionStatus,
    };
  }

  return response;
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  validatePassword,
  formatUserResponse,
};
