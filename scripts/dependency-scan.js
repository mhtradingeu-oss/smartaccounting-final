#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const allowlist = require('./dependency-allowlist');

const auditArgs = ['audit', '--production', '--json'];
const auditResult = spawnSync('npm', auditArgs, {
  encoding: 'utf-8',
  stdio: ['inherit', 'pipe', 'pipe'],
});

const output = auditResult.stdout || auditResult.stderr;

if (!output) {
  console.error('npm audit did not emit JSON output');
  process.exit(1);
}

let auditJson;
try {
  auditJson = JSON.parse(output);
} catch (error) {
  console.error('Failed to parse npm audit output', error.message);
  console.error(output);
  process.exit(1);
}

const advisories = Object.values(auditJson.advisories || {});
const allowSet = new Set(allowlist);
const problems = advisories.filter((advisory) => !allowSet.has(Number(advisory.id)));

if (problems.length === 0) {
  console.log('Dependency scan passed with no unapproved advisories.');
  process.exit(0);
}

console.error('Dependency scan found vulnerabilities that are not allowlisted:');
problems.forEach((advisory) => {
  console.error(`- [${advisory.severity}] ${advisory.module_name} (${advisory.id}): ${advisory.title}`);
  console.error(`  https://npmjs.com/advisories/${advisory.id}`);
});

process.exit(1);
