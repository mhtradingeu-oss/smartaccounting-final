const fs = require('fs');
const path = require('path');
const { getRequestContext } = require('./context');

const environment = process.env.NODE_ENV || 'development';
const packageVersion = (() => {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const pkg = require('../../../package.json');
    return pkg?.version || '1.0.0';
  } catch (error) {
    console.error('Logger could not read package.json version', error);
    return '1.0.0';
  }
})();
const defaultLevel = (process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug'))
  .toLowerCase();
const LEVEL_PRIORITIES = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};
const activeLevel = Object.prototype.hasOwnProperty.call(LEVEL_PRIORITIES, defaultLevel)
  ? defaultLevel
  : 'info';
const activePriority = LEVEL_PRIORITIES[activeLevel];

const SENSITIVE_KEYWORDS = [
  'authorization',
  'auth',
  'password',
  'passphrase',
  'secret',
  'token',
  'apikey',
  'api_key',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'session',
  'cookie',
];

const logDir = path.join(process.cwd(), 'logs');
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (error) {
  // If log directory creation fails, continue but notify.
  console.error('Failed to create log directory', error);
}

function createLogStream(filename) {
  const filePath = path.join(logDir, filename);
  try {
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    stream.on('error', (error) => {
      console.error(`Unable to write ${filename}`, error);
    });
    return stream;
  } catch (error) {
    console.error(`Unable to open ${filename}`, error);
    return null;
  }
}

const combinedStream = createLogStream('combined.log');
const errorStream = createLogStream('error.log');

function isSensitiveKey(key) {
  if (!key) {
    return false;
  }
  const normalized = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function serializeError(error) {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const serialized = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
  };

  if (error.code) {
    serialized.code = error.code;
  }
  if (error.status) {
    serialized.status = error.status;
  }
  if (error.stack) {
    serialized.stack =
      environment === 'production'
        ? error.stack
            .split('\n')
            .slice(0, 4)
            .map((line) => line.trim())
            .join(' | ')
        : error.stack;
  }

  return serialized;
}

function sanitizeMeta(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMeta(entry));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const sanitized = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (isSensitiveKey(key)) {
      sanitized[key] = '<redacted>';
      return;
    }

    if (entry instanceof Error) {
      sanitized[key] = serializeError(entry);
      return;
    }

    if (typeof entry === 'object' && entry !== null) {
      sanitized[key] = sanitizeMeta(entry);
      return;
    }

    sanitized[key] = entry;
  });

  return sanitized;
}

function mergeMeta(baseMeta, incomingMeta) {
  const merged = { ...(baseMeta || {}) };
  if (incomingMeta === undefined || incomingMeta === null) {
    return merged;
  }

  if (incomingMeta instanceof Error) {
    merged.error = serializeError(incomingMeta);
    return merged;
  }

  if (typeof incomingMeta !== 'object' || Array.isArray(incomingMeta)) {
    merged.value = incomingMeta;
    return merged;
  }

  Object.assign(merged, incomingMeta);
  return merged;
}

function shouldLog(level) {
  const priority = LEVEL_PRIORITIES[level];
  if (priority === undefined) {
    return false;
  }
  return priority <= activePriority;
}

function buildContextFields(context = {}) {
  return {
    requestId: context.requestId,
    userId: context.userId,
    companyId: context.companyId,
    method: context.method,
    path: context.path,
    ip: context.ip,
  };
}

function formatMessage(message) {
  if (typeof message === 'string') {
    return message;
  }
  try {
    return JSON.stringify(message);
  } catch (error) {
    return String(message);
  }
}

function writeToConsole(entry, level) {
  const method = console[level] || console.log;
  const metaPayload = {};
  if (entry.channel) {
    metaPayload.channel = entry.channel;
  }
  if (entry.meta) {
    metaPayload.meta = entry.meta;
  }
  const metaText = Object.keys(metaPayload).length
    ? ` ${JSON.stringify(metaPayload)}`
    : '';
  method(`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${metaText}`);
}

function writeToStream(stream, entry) {
  if (!stream || !stream.writable) {
    return;
  }
  try {
    stream.write(`${JSON.stringify(entry)}\n`);
  } catch (error) {
    console.error('Logger failed to persist entry', error);
  }
}

function logMessage(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const sanitized = sanitizeMeta(meta) || {};
  const context = getRequestContext();
  const filteredContext = buildContextFields(context);

  const { channel, ...restMeta } =
    typeof sanitized === 'object' && !Array.isArray(sanitized)
      ? sanitized
      : { channel: undefined };
  const metaPayload =
    typeof sanitized === 'object' && !Array.isArray(sanitized)
      ? Object.keys(restMeta).length
        ? restMeta
        : undefined
      : sanitized;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: formatMessage(message),
    service: 'smartaccounting',
    environment,
    version: packageVersion,
    ...Object.fromEntries(Object.entries(filteredContext).filter(([, value]) => value !== undefined)),
  };

  if (channel) {
    entry.channel = channel;
  }
  if (metaPayload !== undefined) {
    entry.meta = metaPayload;
  }

  writeToStream(combinedStream, entry);
  if (level === 'error') {
    writeToStream(errorStream, entry);
  }
  writeToConsole(entry, level);
}

function createLoggerInstance(baseMeta = {}) {
  const logger = {};

  Object.keys(LEVEL_PRIORITIES).forEach((level) => {
    logger[level] = (message, meta) => {
      const merged = mergeMeta(baseMeta, meta);
      logMessage(level, message, merged);
    };
  });

  logger.child = (meta = {}) =>
    createLoggerInstance(mergeMeta(baseMeta, meta));

  return logger;
}

const logger = createLoggerInstance();

const requestLogger = (req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = Number((seconds * 1000 + nanoseconds / 1e6).toFixed(2));
    logger.info('HTTP request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: `${durationMs}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      companyId: req.companyId || null,
      userId: req.user?.id || null,
    });
  });
  next();
};

const stream = {
  write: (message) => {
    if (typeof message === 'string' && message.trim().length) {
      logger.info(message.trim());
    }
  },
};

logger.security = (message, meta = {}) => logger.warn(message, { ...meta, channel: 'security' });
logger.performance = (message, meta = {}) =>
  logger.info(message, { ...meta, channel: 'performance' });
logger.audit = (message, meta = {}) => logger.info(message, { ...meta, channel: 'audit' });
logger.business = (event, meta = {}) =>
  logger.info(`Business Event: ${event}`, { ...meta, channel: 'business' });

const createChildLogger = (meta = {}) => logger.child(meta);

Object.assign(logger, { requestLogger, stream, createChildLogger });

module.exports = logger;
