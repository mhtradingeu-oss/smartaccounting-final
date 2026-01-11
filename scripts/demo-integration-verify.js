#!/usr/bin/env node
'use strict';

const axios = require('axios');
require('dotenv').config();

const API_URL =
  (process.env.API_URL || 'http://localhost:5001/api').replace(/\/+$/, '');
const EMAIL = process.env.DEMO_ACCOUNTANT_EMAIL || 'demo-accountant@demo.com';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';

const log = (label, status, details = '') => {
  console.log(`[DEMO VERIFY] ${status} — ${label}${details ? ` (${details})` : ''}`);
};

const fail = (label, error) => {
  const status = error?.response?.status ?? error?.status ?? 'unknown';
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'unknown error';
  log(label, 'FAIL', `${status}: ${message}`);
  process.exit(1);
};

const pass = (label, info = '') => {
  log(label, 'PASS', info);
};

const client = axios.create({
  baseURL: API_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function main() {
  let token;
  let companyId;
  try {
    const response = await client.post('/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });
    const payload = response.data ?? {};
    token = payload.token;
    companyId = payload.user?.companyId;
    if (!token || !companyId) {
      throw new Error('Login response missing token or companyId');
    }
    pass('Login as demo-accountant', `status=${response.status}`);
  } catch (error) {
    fail('Login as demo-accountant', error);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Company-Id': companyId,
  };

  try {
    const companies = await client.get('/companies', { headers });
    pass('/companies', `status=${companies.status}`);
  } catch (error) {
    fail('/companies', error);
  }

  try {
    const stats = await client.get('/dashboard/stats', { headers });
    pass('/dashboard/stats', `status=${stats.status}`);
  } catch (error) {
    fail('/dashboard/stats', error);
  }

  console.log('[DEMO VERIFY] ✅ All integration steps passed');
  process.exit(0);
}

main().catch((error) => {
  fail('Unexpected error', error);
});
