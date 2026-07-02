const fs = require('fs');
const dotenv = require('dotenv');

function readEnv(file) {
  if (!fs.existsSync(file)) {return {};}
  return dotenv.parse(fs.readFileSync(file));
}

const root = readEnv('.env');
const client = readEnv('client/.env');
const clientLocal = readEnv('client/.env.local');

let failed = false;

function fail(message) {
  console.error(`ENV GUARD FAIL: ${message}`);
  failed = true;
}

if (root.USE_SQLITE === 'true') {
  fail('root .env must not use USE_SQLITE=true for development runtime');
}

if (!String(root.DATABASE_URL || '').includes('localhost:5441')) {
  fail('root .env DATABASE_URL must point to localhost:5441 for local CLI access');
}

if (client.VITE_API_URL !== '/api') {
  fail('client/.env VITE_API_URL must be /api');
}

if (clientLocal.VITE_WS_URL) {
  fail('client/.env.local must not enable VITE_WS_URL until realtime backend is official');
}

if (!fs.existsSync('docs/ARCHITECTURE_LOCK/ENVIRONMENT_SOURCE_OF_TRUTH.md')) {
  fail('environment lock document missing');
}

if (failed) {process.exit(1);}

console.log('ENV GUARD PASS: environment source of truth is locked.');
