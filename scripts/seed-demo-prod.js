#!/usr/bin/env node
const { spawnSync } = require('child_process');

const requireDemoMode = () => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';
  if (!demoModeEnabled || !demoSeedAllowed) {
    console.error(
      '[seed:demo:prod] aborted: DEMO_MODE=true and ALLOW_DEMO_SEED=true are required to run the demo seeder.',
    );
    process.exit(1);
  }
};

const requireProduction = () => {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[seed:demo:prod] NODE_ENV=${process.env.NODE_ENV}. Resetting to production for migration safety.`,
    );
  }
  process.env.NODE_ENV = 'production';
};

const runCommand = (command, args) => {
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
};

requireDemoMode();
requireProduction();

console.log('[seed:demo:prod] running guarded demo seeder...');
runCommand('npx', [
  'sequelize-cli',
  'db:seed',
  '--seed',
  '20251226-demo-seed.js',
  '--seeders-path',
  'database/seeders/demo',
]);
console.log('[seed:demo:prod] demo seeder completed.');
