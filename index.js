// Application entrypoint: loads configuration, syncs DB, then starts the Express app from src/app.js.
require('dotenv').config();
const validateEnvironment = require('./src/utils/validateEnv');
const { startServer } = require('./src/server');
const { setupCluster } = require('./src/middleware/performance');
const logger = require('./src/lib/logger');

if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

async function bootstrap() {
  const shouldContinue = setupCluster();
  if (!shouldContinue) {
    return;
  }

  await startServer();
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
