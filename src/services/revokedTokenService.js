const { RevokedToken } = require('../models');
const { Op } = require('sequelize');

async function revokeToken({ jti, expiresAt }) {
  if (!jti) {
    return null;
  }
  const sanitizedExpiresAt = expiresAt instanceof Date ? expiresAt : expiresAt ? new Date(expiresAt) : null;
  const [token] = await RevokedToken.findOrCreate({
    where: { jti },
    defaults: { expiresAt: sanitizedExpiresAt },
  });
  return token;
}

async function isTokenRevoked(jti) {
  if (!jti) {
    return false;
  }
  const token = await RevokedToken.findOne({
    where: {
      jti,
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } },
      ],
    },
  });
  return Boolean(token);
}

module.exports = {
  revokeToken,
  isTokenRevoked,
};
