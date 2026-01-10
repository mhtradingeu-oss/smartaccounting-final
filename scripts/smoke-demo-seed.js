#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

require('dotenv').config();
const axios = require('axios');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* --------------------------------------------------
 * Configuration (single source of truth)
 * -------------------------------------------------- */

const API_BASE = process.env.API_URL || 'http://localhost:5001/api';
const CONTRACT_PATH = path.join(__dirname, 'demo-contract.json');

assert(fs.existsSync(CONTRACT_PATH), 'Missing demo-contract.json');

const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));

const ADMIN = CONTRACT.users.find((u) => u.role === 'admin');
assert(ADMIN, 'Admin demo user not defined in demo-contract.json');

const DEMO_EMAIL = ADMIN.email;
const DEMO_PASSWORD = CONTRACT.credentials?.password;

assert(DEMO_PASSWORD, 'Demo password missing in demo-contract.json');

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

function extractList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload?.success && Array.isArray(payload.data)) {
    return payload.data;
  }
  return null;
}

async function loginDemo() {
  console.log('[DEMO VERIFY] Logging in demo admin...');
  const res = await client.post('/auth/login', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  assert.strictEqual(res.status, 200, 'Login failed');

  const token = res.data?.token || res.data?.accessToken;
  const companyId = res.data?.user?.companyId;
  assert(token, 'Login response missing token');
  assert(companyId, 'Login response missing companyId');

  console.log('[DEMO VERIFY] Login OK');
  return { token, companyId };
}

async function verifyListEndpoint(path, session, allowEmpty = false) {
  const { token, companyId } = session;
  console.log(`[DEMO VERIFY] Checking ${path} ...`);
  const res = await client.get(path, {
    headers: { Authorization: `Bearer ${token}`, 'X-Company-Id': companyId },
  });

  assert.strictEqual(res.status, 200, `${path} returned ${res.status}`);

  const list = extractList(res.data);
  assert(list !== null, `${path} did not return a list`);

  if (!allowEmpty) {
    assert(list.length > 0, `${path} returned empty list`);
  }

  console.log(`[DEMO VERIFY] ${path} OK (${list.length} items)`);
  return list;
}

/* --------------------------------------------------
 * Main verification
 * -------------------------------------------------- */

async function runDemoChecks(session) {
  await verifyListEndpoint('/companies', session);
  await verifyListEndpoint('/dashboard/stats', session, true);
  await verifyListEndpoint('/expenses', session, true);

  const statements = await verifyListEndpoint('/bank-statements', session);
  assert(statements[0], 'No demo bank statement found');

  await verifyListEndpoint('/ai/insights', session, true);
  await verifyListEndpoint('/ai/decisions', session, true);
}

/* --------------------------------------------------
 * Runner
 * -------------------------------------------------- */

(async () => {
  try {
    const session = await loginDemo();
    await runDemoChecks(session);
    console.log('✅ Demo seed verification PASSED');
    process.exit(0);
  } catch (err) {
    console.error('❌ Demo seed verification FAILED');
    console.error(err.message || err);
    process.exit(1);
  }
})();
