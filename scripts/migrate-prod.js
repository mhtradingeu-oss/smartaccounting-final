#!/usr/bin/env node
const { spawnSync } = require('child_process');
const validateEnvironment = require('../src/utils/validateEnv');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Failed to run ${command} ${args.join(' ')}`, result.error);
    process.exit(result.status || 1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

try {
  console.log('[migrate:prod] validating environment...');
  validateEnvironment();
} catch (error) {
  console.error('[migrate:prod] environment validation failed:', error.message);
  process.exit(1);
}

console.log('[migrate:prod] running Sequelize migrations (production)...');
runCommand('npx', ['sequelize-cli', 'db:migrate']);
console.log('[migrate:prod] migrations completed.');
