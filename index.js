// Application entrypoint: loads configuration, syncs DB, then starts the Express app from src/app.js.
require('dotenv').config();
const validateEnvironment = require('./src/utils/validateEnv');
const { startServer } = require('./src/server');
const logger = require('./src/lib/logger');

validateEnvironment();

startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
