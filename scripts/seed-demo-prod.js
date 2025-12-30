#!/usr/bin/env node
const { spawnSync } = require('child_process');

const requireDemoMode = () => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';
  const missing = [];
  if (!demoModeEnabled) {missing.push('DEMO_MODE=true');}
  if (!demoSeedAllowed) {missing.push('ALLOW_DEMO_SEED=true');}
  if (missing.length) {
    console.error(
      `[seed:demo:prod] aborted: ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} required to run the demo seeder.`,
    );
    console.error(
      `[seed:demo:prod] current flags: DEMO_MODE=${process.env.DEMO_MODE || 'undefined'} ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED || 'undefined'}`,
    );
    process.exit(1);
  }
};

const verifySchema = () => {
  const result = spawnSync('node', ['scripts/verify-schema.js'], {
    env: process.env,
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join('\n');
    console.error('[seed:demo:prod] aborted: Schema is not ready for seeding.');
    if (message) {
      console.error(`[seed:demo:prod] schema error: ${message.trim()}`);
    }
    process.exit(result.status);
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

const configureDemoPassword = () => {
  if (process.env.DEMO_MODE !== 'true') {
    return;
  }
  const password = process.env.DEMO_PASSWORD || 'Demo123!';
  process.env.DEMO_PASSWORD = password;
  console.log(`[seed:demo:prod] using deterministic demo password: ${password}`);
};

const DEMO_USERS = [
  { email: 'demo-admin@demo.com', role: 'admin' },
  { email: 'demo-accountant@demo.com', role: 'accountant' },
  { email: 'demo-auditor@demo.com', role: 'auditor' },
  { email: 'demo-viewer@demo.com', role: 'viewer' },
];

const printLoginSheet = () => {
  const password = process.env.DEMO_PASSWORD || 'Demo123!';
  console.log('\n[seed:demo:prod] Login sheet (demo credentials)');
  console.log('[seed:demo:prod] Email                 | Role        | Password');
  DEMO_USERS.forEach((user) => {
    console.log(
      `[seed:demo:prod] ${user.email.padEnd(22)} | ${user.role.padEnd(11)} | ${password}`,
    );
  });
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
verifySchema();
configureDemoPassword();

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
printLoginSheet();
