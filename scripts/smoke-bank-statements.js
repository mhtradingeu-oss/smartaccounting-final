#!/usr/bin/env node
/* eslint-disable no-console */

'use strict';

require('dotenv').config();
const axios = require('axios');
const assert = require('assert');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/* --------------------------------------------------
 * Configuration (single source of truth)
 * -------------------------------------------------- */

const API_BASE = process.env.API_URL || 'http://localhost:5001/api';
const CONTRACT_PATH = path.join(__dirname, 'demo-contract.json');

assert(fs.existsSync(CONTRACT_PATH), 'Missing demo-contract.json');

const DEMO_CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));

const ADMIN_USER = DEMO_CONTRACT.users.find((u) => u.role === 'admin');
assert(ADMIN_USER, 'Admin demo user not defined in demo-contract.json');

const DEMO_EMAIL = ADMIN_USER.email;
const DEMO_PASSWORD = DEMO_CONTRACT.credentials?.password;

assert(DEMO_PASSWORD, 'Demo password missing in demo-contract.json');

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

const SAMPLE_CSV_CONTENT = `date;amount;description;counterparty;reference
01.04.2026;1240;Demo income from smartaccounting;Smart Accounting GmbH;SMOKE-INCOME-001
03.04.2026;-320;Demo expense for office supplies;PB Office Supplies;SMOKE-EXPENSE-001
`;

/* --------------------------------------------------
 * Auth
 * -------------------------------------------------- */

async function loginDemo() {
  console.log('[SMOKE] Logging in demo admin...');
  const res = await client.post('/auth/login', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  assert.strictEqual(res.status, 200, 'Login failed');
  const token = res.data?.token || res.data?.accessToken;
  const companyId = res.data?.user?.companyId;
  assert(token, 'Login response missing token');
  assert(companyId, 'Login response missing companyId');

  console.log('[SMOKE] Login OK');
  return { token, companyId };
}

/* --------------------------------------------------
 * Bank Statements Smoke
 * -------------------------------------------------- */

async function smokeBankStatements({ token, companyId }) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId };

  console.log('[SMOKE] Listing bank statements...');
  const listRes = await client.get('/bank-statements', { headers });
  assert.strictEqual(listRes.status, 200, 'List bank-statements failed');

  console.log('[SMOKE] Uploading dry-run CSV...');
  const form = new FormData();
  form.append('bankStatement', Buffer.from(SAMPLE_CSV_CONTENT, 'utf-8'), {
    filename: 'smoke-demo-statement.csv',
    contentType: 'text/csv',
  });
  form.append('format', 'CSV');

  const dryRunRes = await client.post('/bank-statements/import?dryRun=true', form, {
    headers: { ...headers, ...form.getHeaders() },
  });

  assert.strictEqual(dryRunRes.status, 200, 'Dry-run import failed');

  const dryRunId = dryRunRes.data?.dryRunId;
  assert(dryRunId, 'Dry-run response missing dryRunId');

  console.log('[SMOKE] Dry-run import OK');

  console.log('[SMOKE] Confirming dry-run (optional)...');
  try {
    const confirmRes = await client.post('/bank-statements/import/confirm', { dryRunId }, { headers });
    assert.strictEqual(confirmRes.status, 200);
    console.log('[SMOKE] Import confirm OK');
  } catch (err) {
    console.warn('[SMOKE] Import confirm skipped or not supported');
  }

  console.log('[SMOKE] Attempt reconcile (optional)...');
  try {
    const reconcileRes = await client.post('/bank-statements/reconcile', {}, { headers });
    assert.strictEqual(reconcileRes.status, 200);
    console.log('[SMOKE] Reconcile OK');
  } catch (err) {
    console.warn('[SMOKE] Reconcile skipped or not supported');
  }
}

/* --------------------------------------------------
 * Runner
 * -------------------------------------------------- */

(async () => {
  try {
    const session = await loginDemo();
    await smokeBankStatements(session);
    console.log('✅ Bank Statements smoke test PASSED');
    process.exit(0);
  } catch (err) {
    console.error('❌ Bank Statements smoke test FAILED');
    console.error(err.message || err);
    process.exit(1);
  }
})();
