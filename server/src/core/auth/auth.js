const jwt = require('jsonwebtoken');

class Auth {

  static generateToken(user) {
    return jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  static verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

}

module.exports = Auth;
