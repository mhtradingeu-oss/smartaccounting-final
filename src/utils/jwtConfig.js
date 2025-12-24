const { parseDurationToMs } = require('./duration');

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

function getJwtExpiresMs() {
  const defaultMs = 60 * 60 * 1000;
  return parseDurationToMs(getJwtExpiresIn(), defaultMs);
}

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
  getJwtExpiresMs,
};
