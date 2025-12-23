const pkg = require('../../package.json');

module.exports = {
  name: 'SmartAccounting',
  version: pkg.version,
  environment: process.env.NODE_ENV || 'development',
  buildTime: process.env.BUILD_TIME || null,
  commit: process.env.GIT_COMMIT || null,
};
