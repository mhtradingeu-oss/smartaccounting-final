const cors = require('cors');
const logger = require('../lib/logger'); // central logger lives under src/lib/logger

const { FRONTEND_URL, CLIENT_URL, CORS_ORIGIN, NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://localhost:3000',
  'https://localhost:3001',
  'https://localhost:5173',
  'http://host.docker.internal:3000',
  'http://host.docker.internal:3001',
];

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set(
  [
    ...parseOrigins(FRONTEND_URL),
    ...parseOrigins(CLIENT_URL),
    ...parseOrigins(CORS_ORIGIN),
    ...(!isProduction ? defaultOrigins : []),
  ].filter(Boolean),
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const requestOrigin = String(origin).toLowerCase();
    const matchesAllowed = Array.from(allowedOrigins).some((allowed) => {
      try {
        return requestOrigin === String(allowed).toLowerCase();
      } catch (error) {
        logger.warn('Invalid CORS allowlist origin ignored:', allowed);
        return false;
      }
    });

    if (matchesAllowed) {
      return callback(null, true);
    }

    logger.warn('Blocked CORS origin:', origin);
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'X-AI-Purpose',
    'x-ai-purpose',
    'authorization',
    'content-type',
    'Content-Type',
    'Authorization',
    'x-company-id',
    'X-Company-Id',
    'x-ai-policy-version',
    'X-AI-Policy-Version',
    'x-request-id',
    'x-requested-with',
    'Accept',
    'Origin',
    'Upgrade',
    'Connection',
    'Sec-WebSocket-Key',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Protocol',
  ],
};

module.exports = cors(corsOptions);
