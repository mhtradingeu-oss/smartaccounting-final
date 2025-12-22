const pkg = require('../../package.json');

const sanitizeEnv = (value, fallback) => {
  if (!value || value === 'undefined') {
    return fallback;
  }
  return value;
};

const BUILD_COMMIT_SHA = sanitizeEnv(process.env.BUILD_COMMIT_SHA, 'unknown');
const BUILD_TIMESTAMP = sanitizeEnv(process.env.BUILD_TIMESTAMP, new Date().toISOString());
const BUILD_IMAGE_DIGEST = sanitizeEnv(process.env.BUILD_IMAGE_DIGEST, process.env.DOCKER_IMAGE_DIGEST || 'unknown');

module.exports = {
  packageVersion: pkg.version,
  commitHash: BUILD_COMMIT_SHA,
  buildTimestamp: BUILD_TIMESTAMP,
  imageDigest: BUILD_IMAGE_DIGEST,
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
};
