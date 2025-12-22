let cachedSecret;

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

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
};
