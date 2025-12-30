#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const composeFile = process.argv[2] || 'docker-compose.test.yml';
const serviceName = process.argv[3] || 'db';
const maxAttempts = Number(process.env.PG_READY_MAX_ATTEMPTS || 15);
const intervalMs = Number(process.env.PG_READY_INTERVAL_MS || 2000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runComposeCommand(args) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, ...args], {
    encoding: 'utf-8',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Exit code ${result.status}`);
  }
  return result.stdout.trim();
}

async function waitForContainer() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const containerId = runComposeCommand(['ps', '-q', serviceName]);
    if (containerId) {
      console.log(`[wait-for-postgres] found container ${containerId}`);
      return containerId;
    }
    console.log(
      `[wait-for-postgres] waiting for container ${serviceName} to appear (attempt ${attempt}/${maxAttempts})`,
    );
    await sleep(intervalMs);
  }
  throw new Error(`Container ${serviceName} did not appear after ${maxAttempts} attempts`);
}

async function waitForReadiness(containerId) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync('docker', [
      'exec',
      containerId,
      'pg_isready',
      '-U',
      'postgres',
      '-d',
      'smartaccounting_test',
    ]);
    if (result.status === 0) {
      console.log(`[wait-for-postgres] postgres ready (container ${containerId})`);
      return;
    }
    console.log(
      `[wait-for-postgres] postgres not ready yet (attempt ${attempt}/${maxAttempts}); retrying in ${intervalMs}ms`,
    );
    await sleep(intervalMs);
  }
  throw new Error('Postgres readiness check timed out');
}

(async () => {
  try {
    const containerId = await waitForContainer();
    await waitForReadiness(containerId);
  } catch (error) {
    console.error(`[wait-for-postgres] ${error.message}`);
    process.exit(1);
  }
})();
