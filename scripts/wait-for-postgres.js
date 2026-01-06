#!/usr/bin/env node
'use strict';

/**
 * scripts/wait-for-postgres.js
 * Robust Postgres readiness checker for Docker / CI / Local
 */

const { spawnSync } = require('child_process');

const composeFile = process.argv[2] || 'docker-compose.yml';
const serviceName = process.argv[3] || 'db';

const maxAttempts = Number(process.env.PG_READY_MAX_ATTEMPTS || 15);
const intervalMs = Number(process.env.PG_READY_INTERVAL_MS || 2000);

// Skip entirely if SQLite is used
if (process.env.USE_SQLITE === 'true') {
  console.log('[wait-for-postgres] USE_SQLITE=true → skipping Postgres readiness check');
  process.exit(0);
}

const PG_USER = process.env.POSTGRES_USER || 'postgres';
const PG_DB =
  process.env.POSTGRES_DB ||
  process.env.DB_NAME ||
  process.env.PGDATABASE ||
  'postgres';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf-8',
    stdio: options.stdio || 'pipe',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `docker ${args.join(' ')} failed`);
  }
  return result.stdout?.trim();
}

function runCompose(args) {
  return runDocker(['compose', '-f', composeFile, ...args]);
}

async function waitForContainer() {
  console.log(`[wait-for-postgres] compose=${composeFile} service=${serviceName}`);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const containerId = runCompose(['ps', '-q', serviceName]);
    if (containerId) {
      console.log(`[wait-for-postgres] container found: ${containerId}`);
      return containerId;
    }
    console.log(
      `[wait-for-postgres] waiting for container "${serviceName}" (${attempt}/${maxAttempts})`,
    );
    await sleep(intervalMs);
  }
  throw new Error(`Container "${serviceName}" not found after ${maxAttempts} attempts`);
}

async function waitForReadiness(containerId) {
  console.log(
    `[wait-for-postgres] checking pg_isready (user=${PG_USER}, db=${PG_DB})`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        containerId,
        'pg_isready',
        '-U',
        PG_USER,
        '-d',
        PG_DB,
      ],
      { stdio: 'ignore' },
    );

    if (result.status === 0) {
      console.log('[wait-for-postgres] Postgres is READY');
      return;
    }

    console.log(
      `[wait-for-postgres] Postgres not ready (${attempt}/${maxAttempts}) → retry in ${intervalMs}ms`,
    );
    await sleep(intervalMs);
  }

  throw new Error(
    `Postgres not ready after ${maxAttempts} attempts (user=${PG_USER}, db=${PG_DB})`,
  );
}

(async () => {
  try {
    const containerId = await waitForContainer();
    await waitForReadiness(containerId);
    process.exit(0);
  } catch (err) {
    console.error('[wait-for-postgres] Error:', err.message || err);
    process.exit(1);
  }
})();