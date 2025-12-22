const { ActiveToken } = require('../models');

async function addToken({ userId, jti, expiresAt }) {
  if (!userId || !jti) {
    return null;
  }

  return ActiveToken.create({ userId, jti, expiresAt });
}

async function removeToken(jti) {
  if (!jti) {
    return null;
  }

  return ActiveToken.destroy({ where: { jti } });
}

async function removeAllTokensForUser(userId) {
  if (!userId) {
    return null;
  }

  return ActiveToken.destroy({ where: { userId } });
}

async function getTokensForUser(userId) {
  if (!userId) {
    return [];
  }

  return ActiveToken.findAll({ where: { userId } });
}

module.exports = {
  addToken,
  removeToken,
  removeAllTokensForUser,
  getTokensForUser,
};
