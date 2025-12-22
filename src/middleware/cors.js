const cors = require('cors');
const logger = require('../lib/logger'); // central logger lives under src/lib/logger

const { FRONTEND_URL, NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://localhost:3000',
  'https://localhost:5173',
];

const allowedOrigins = new Set(
  [FRONTEND_URL, ...(!isProduction ? defaultOrigins : [])].filter(Boolean),
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
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
