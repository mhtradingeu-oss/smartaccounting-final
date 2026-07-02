const fs = require('fs');

const forbiddenDailyCommands = [
  'node server/index.js',
  'node src/server.js',
  'cd client && npm run dev',
];

const requiredScripts = ['start:all', 'stop:all'];

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};

let failed = false;

for (const scriptName of requiredScripts) {
  if (!scripts[scriptName]) {
    console.error(`RUNTIME GUARD FAIL: missing package script ${scriptName}`);
    failed = true;
  }
}

for (const cmd of forbiddenDailyCommands) {
  if (scripts.start === cmd || scripts.dev === cmd) {
    console.error(`RUNTIME GUARD FAIL: package script points to forbidden daily command: ${cmd}`);
    failed = true;
  }
}

if (!fs.existsSync('scripts/start-all.sh')) {
  console.error('RUNTIME GUARD FAIL: scripts/start-all.sh missing');
  failed = true;
}

if (!fs.existsSync('scripts/stop-all.sh')) {
  console.error('RUNTIME GUARD FAIL: scripts/stop-all.sh missing');
  failed = true;
}

if (!fs.existsSync('docs/ARCHITECTURE_LOCK/RUNTIME_SOURCE_OF_TRUTH.md')) {
  console.error('RUNTIME GUARD FAIL: runtime lock document missing');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('RUNTIME GUARD PASS: start:all / stop:all are the locked daily runtime.');
