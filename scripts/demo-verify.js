#!/usr/bin/env node
'use strict';

/**
 * Demo verification script
 * API-only smoke verifier for the running local/Docker stack.
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = (process.env.API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
const EMAIL = process.env.DEMO_ADMIN_EMAIL || process.env.DEMO_EMAIL || 'demo-admin@demo.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function extractCount(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  for (const key of preferredKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key].length;
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data.length;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items.length;
  }

  if (payload && typeof payload === 'object') {
    return 1;
  }

  return 0;
}

async function main() {
  console.log(`[DEMO VERIFY] API_URL=${API_URL}`);
  console.log('[DEMO VERIFY] Logging in as demo admin...');

  const login = await client.post('/auth/login', {
    email: EMAIL,
    password: PASSWORD,
  });

  const token = login.data?.token || login.data?.accessToken;
  const companyId = login.data?.user?.companyId;

  if (!token || !companyId) {
    throw new Error('Login response missing token or companyId');
  }

  console.log('[DEMO VERIFY] Login OK');

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Company-Id': companyId,
    'x-company-id': companyId,
  };

  const checks = [
    { path: '/companies', keys: ['companies', 'data'] },
    { path: '/invoices', keys: ['invoices', 'data'] },
    { path: '/expenses', keys: ['expenses', 'data'] },
    { path: '/bank-statements', keys: ['statements', 'bankStatements', 'data'] },
    {
      path: '/ai/insights',
      keys: ['insights', 'data'],
      headers: {
        'x-ai-purpose': 'insights_read',
        'x-ai-policy-version': '10.0.0',
      },
      allowEmpty: true,
    },
  ];

  for (const check of checks) {
    const response = await client.get(check.path, {
      headers: {
        ...headers,
        ...(check.headers || {}),
      },
    });

    if (![200, 201, 204].includes(response.status)) {
      throw new Error(`${check.path} returned ${response.status}`);
    }

    const count = extractCount(response.data, check.keys);

    if (!check.allowEmpty && count === 0) {
      throw new Error(`${check.path} returned empty payload`);
    }

    console.log(`[DEMO VERIFY] ${check.path} OK (${count} records)`);
  }

  console.log('[DEMO VERIFY] ✅ Demo verification PASSED');
}

main().catch((error) => {
  console.error('[DEMO VERIFY] ❌ Demo verification FAILED');
  console.error(error?.response?.data || error?.message || error);
  process.exit(1);
});
