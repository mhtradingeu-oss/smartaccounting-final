const cors = require('cors');

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.CORS_ORIGIN),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
]);

const corsOptions = {
  origin (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
};

module.exports = function createCorsMiddleware() {
  return cors(corsOptions);
};
