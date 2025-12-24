const cors = require('cors');
const logger = require('../lib/logger'); // central logger lives under src/lib/logger

const { FRONTEND_URL, CLIENT_URL, CORS_ORIGIN, NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://localhost:3000',
  'https://localhost:5173',
];

const allowedOrigins = new Set(
  [FRONTEND_URL, CLIENT_URL, CORS_ORIGIN, ...(!isProduction ? defaultOrigins : [])].filter(Boolean),
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const requestOrigin = origin.toLowerCase();
    const matchesAllowed = Array.from(allowedOrigins)
      .some((allowed) => requestOrigin === allowed.toLowerCase());

    if (matchesAllowed) {
      return callback(null, true);
    }

    logger.warn('Blocked CORS origin:', origin);
    return callback(null, false);
  },
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token',
    'X-Request-Id',
  ],
};

const corsInstance = cors(corsOptions);
corsInstance.corsOptions = corsOptions;
corsInstance.allowedOrigins = allowedOrigins;
corsInstance.defaultOrigins = defaultOrigins;
corsInstance.isProduction = isProduction;

module.exports = corsInstance;
