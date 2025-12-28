let cachedSecret;
let cachedRefreshSecret;

function getJwtSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured via environment variables');
  }
  cachedSecret = secret;
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1h';
}

function getRefreshSecret() {
  if (cachedRefreshSecret) {
    return cachedRefreshSecret;
  }
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be configured via environment variables');
  }
  cachedRefreshSecret = refreshSecret;
  return refreshSecret;
}

function getRefreshExpiresIn() {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
  getRefreshSecret,
  getRefreshExpiresIn,
};
