const { parseDurationToMs } = require('./duration');

const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const refreshTokenMaxAgeMs = parseDurationToMs(refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000);
const maxSessionLifetimeMs = parseDurationToMs(process.env.MAX_SESSION_LIFETIME || '30d', 30 * 24 * 60 * 60 * 1000);

function getRefreshTokenExpiresIn() {
  return refreshTokenExpiresIn;
}

function getRefreshTokenMaxAgeMs() {
  return refreshTokenMaxAgeMs;
}

function getMaxSessionLifetimeMs() {
  return maxSessionLifetimeMs;
}

module.exports = {
  getRefreshTokenExpiresIn,
  getRefreshTokenMaxAgeMs,
  getMaxSessionLifetimeMs,
};
