const { URL } = require('url');
const logger = require('../lib/logger');

const requiredEnvVars = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];

const optionalEnvVars = [
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
  'STRIPE_SECRET_KEY',
  'ELSTER_CERTIFICATE_PATH',
  'REDIS_URL',
  'CACHE_TTL',
];

const observabilityEnvHints = {
  LOG_LEVEL:
    'LOG_LEVEL controls structured logging verbosity (defaults to info in production, debug otherwise).',
  METRICS_ENABLED:
    'METRICS_ENABLED toggles runtime metrics snapshots (set true to enable, default false).',
  REQUEST_LOGGING:
    'REQUEST_LOGGING toggles HTTP request logs (set false to silence, default true).',
  LOG_SLOW_REQUEST_MS:
    'LOG_SLOW_REQUEST_MS adjusts the slow request warning threshold in milliseconds (default 1000).',
};

const allowedNodeEnvs = ['development', 'production', 'test'];

function validateUrl(varName, value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch (err) {
    throw new Error(`${varName} must be a valid http(s) URL`);
  }
}

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];

    if (!value) {
      errors.push(`${varName} is required but not set`);
      return;
    }

    switch (varName) {
      case 'NODE_ENV': {
        if (!allowedNodeEnvs.includes(value)) {
          errors.push(`${varName} must be one of: ${allowedNodeEnvs.join(', ')}`);
        }
        break;
      }
      case 'PORT': {
        const port = Number(value);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          errors.push(`${varName} must be a valid port number`);
        }
        break;
      }
      case 'JWT_SECRET': {
        if (process.env.NODE_ENV !== 'test' && value.length < 32) {
          errors.push('JWT_SECRET must be at least 32 characters long');
        }
        break;
      }
      case 'FRONTEND_URL': {
        try {
          validateUrl(varName, value);
        } catch (error) {
          errors.push(error.message);
        }
        break;
      }
      case 'DATABASE_URL': {
        if (!value.includes('://')) {
          errors.push('DATABASE_URL must include a scheme (e.g. postgres:// or sqlite:)');
        }
        break;
      }
      default:
        break;
    }
  });

  optionalEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  Object.entries(observabilityEnvHints).forEach(([varName, hint]) => {
    if (!process.env[varName]) {
      warnings.push(hint);
    }
  });

  const booleanFlag = (value) =>
    value && ['true', 'false'].includes(value.toString().toLowerCase());

  if (process.env.METRICS_ENABLED && !booleanFlag(process.env.METRICS_ENABLED)) {
    warnings.push('METRICS_ENABLED must be true or false');
  }

  if (process.env.REQUEST_LOGGING && !booleanFlag(process.env.REQUEST_LOGGING)) {
    warnings.push('REQUEST_LOGGING must be true or false');
  }

  if (process.env.LOG_SLOW_REQUEST_MS) {
    const threshold = Number(process.env.LOG_SLOW_REQUEST_MS);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      warnings.push('LOG_SLOW_REQUEST_MS must be a positive number');
    }
  }

  if (process.env.LOG_LEVEL) {
    const allowedLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    if (!allowedLevels.includes(process.env.LOG_LEVEL.toLowerCase())) {
      warnings.push('LOG_LEVEL is set to an unexpected level and will fall back to defaults');
    }
  }

  if (errors.length > 0) {
    logger.error('❌ Environment startup validation failed');
    errors.forEach((message) => logger.error(message));
    throw new Error('Required environment validation failed');
  }

  if (warnings.length > 0) {
    logger.warn('⚠️ Optional environment variables missing (features may be degraded):', warnings);
  }

  logger.info('✅ Environment validation passed');
  return true;
}

module.exports = validateEnvironment;
