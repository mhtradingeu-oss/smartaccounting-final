#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------
// Resolve demo seed file
// --------------------------------------------------
const DEMO_SEED_PATH = path.resolve('database/seeders/demo/20251226-demo-seed.js');

if (!fs.existsSync(DEMO_SEED_PATH)) {
  console.error('[seed:demo:prod] ❌ demo seed file missing.');
  process.exit(1);
}

const demoSeedModule = require(DEMO_SEED_PATH);

// --------------------------------------------------
// Guards
// --------------------------------------------------
const requireDemoMode = () => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';

  const missing = [];
  if (!demoModeEnabled) {
    missing.push('DEMO_MODE=true');
  }
  if (!demoSeedAllowed) {
    missing.push('ALLOW_DEMO_SEED=true');
  }

  if (missing.length) {
    console.error(`[seed:demo:prod] aborted: ${missing.join(' and ')} required.`);
    console.error(
      `[seed:demo:prod] current flags: DEMO_MODE=${process.env.DEMO_MODE || 'undefined'} ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED || 'undefined'}`,
    );
    process.exit(1);
  }
};

const refuseRealProductionWithoutOverride = () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED_PROD !== 'true') {
    console.error('[seed:demo:prod] ❌ production run requires ALLOW_DEMO_SEED_PROD=true');
    process.exit(1);
  }
};

const ensureProductionNodeEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[seed:demo:prod] NODE_ENV=${process.env.NODE_ENV}. Forcing production.`);
  }
  process.env.NODE_ENV = 'production';
};

const verifySchema = () => {
  const result = spawnSync('node', ['scripts/verify-schema.js'], {
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('[seed:demo:prod] ❌ schema verification failed.');
    process.exit(result.status);
  }
};

const configureDemoPassword = () => {
  const password = process.env.DEMO_PASSWORD || 'Demo123!';
  process.env.DEMO_PASSWORD = password;
  console.log(`[seed:demo:prod] demo password: ${password}`);
};

// --------------------------------------------------
// Demo users info
// --------------------------------------------------
const { DEMO_EMAILS } = require('./demo-users');
const ROLES = ['admin', 'accountant', 'auditor', 'viewer'];
const USERS = DEMO_EMAILS.map((email, i) => ({
  email,
  role: ROLES[i] || 'viewer',
}));

const printLoginSheet = () => {
  console.log('\n[seed:demo:prod] Demo credentials:');
  USERS.forEach((u) =>
    console.log(`[seed:demo:prod] ${u.email} | ${u.role} | ${process.env.DEMO_PASSWORD}`),
  );
};

// --------------------------------------------------
// MAIN
// --------------------------------------------------
(async () => {
  try {
    requireDemoMode();
    refuseRealProductionWithoutOverride();
    ensureProductionNodeEnv();
    verifySchema();
    configureDemoPassword();

    console.log(`[seed:demo:prod] Target DB: ${process.env.DATABASE_URL || 'sqlite'}`);

    const { sequelize } = require('../src/models');

    // Determine callable seed function
    let seedPromise;

    if (typeof demoSeedModule === 'function') {
      // Case 1: module.exports = async function
      seedPromise = demoSeedModule({ sequelize });
    } else if (typeof demoSeedModule?.default === 'function') {
      // Case 2: export default async function
      seedPromise = demoSeedModule.default({ sequelize });
    } else if (typeof demoSeedModule?.up === 'function') {
      // Case 3: Sequelize-style seeder { up() }
      seedPromise = demoSeedModule.up(
        { sequelize, queryInterface: sequelize.getQueryInterface() },
        null,
      );
    } else {
      throw new Error('Demo seed must export a function or an object with an up() method');
    }

    await seedPromise;

    console.log('[seed:demo:prod] ✅ demo seed completed');
    printLoginSheet();

    console.log('\n========================================');
    console.log('[seed:demo:prod] DEMO READY ✅');
    console.log('Frontend: http://localhost:3000');
    console.log('API:      http://localhost:5001/api');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('[seed:demo:prod] ❌ FAILED:', err);
    process.exit(1);
  }
})();
