const logger = require('./lib/logger');
const { sequelize } = require('./models');
const { runMigrations } = require('./lib/database/runMigrations');
const app = require('./app');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = app.get('apiPrefix') || process.env.API_BASE_URL || '/api';

let serverInstance = null;
let signalsAttached = false;

async function closeServer() {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(() => resolve()));
    serverInstance = null;
  }

  if (sequelize) {
    await sequelize.close();
  }
}

function attachSignalHandlers() {
  if (signalsAttached) {
    return;
  }

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    try {
      await closeServer();
    } catch (err) {
      logger.error('Error while shutting down', { error: err.message });
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.stack || error.message });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    process.exit(1);
  });

  signalsAttached = true;
}

async function startServer() {
  if (serverInstance) {
    return serverInstance;
  }

  await runMigrations();
  serverInstance = app.listen(PORT, HOST, () => {
    logger.info('Server running', {
      host: HOST,
      port: PORT,
      apiPrefix: API_PREFIX,
      environment: process.env.NODE_ENV || 'development',
    });
    logger.info(`Swagger docs available at http://localhost:${PORT}/api/docs`);
  });

  attachSignalHandlers();

  return serverInstance;
}

module.exports = {
  startServer,
  closeServer,
};
