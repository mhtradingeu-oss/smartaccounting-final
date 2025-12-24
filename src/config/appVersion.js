const { version } = require('./version');

module.exports = {
  name: 'SmartAccounting',
  version,
  environment: process.env.NODE_ENV || 'development',
  buildTime: process.env.BUILD_TIME || null,
  commit: process.env.GIT_COMMIT || null,
};
