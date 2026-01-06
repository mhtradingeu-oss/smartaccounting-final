#!/usr/bin/env node
const axios = require('axios');
const { URLSearchParams } = require('url');

const DEFAULT_BASE_URL = 'http://localhost:5001';
const baseUrl = (process.env.DEV_SMOKE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const client = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  validateStatus: null,
});

const log = (message) => {
  // align with other scripts for easier grepping
  // eslint-disable-next-line no-console
  console.log(`[dev-smoke] ${message}`);
};

const fail = (message, error) => {
  // eslint-disable-next-line no-console
  console.error(`[dev-smoke] ERROR ${message}`);
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error.response?.data || error.message || error);
  }
  process.exit(1);
};

async function request(path, { method = 'get', headers, data } = {}) {
  const response = await client.request({
    url: path,
    method,
    headers,
    data,
  });

  if (!response || response.status >= 400) {
    const error = new Error(
      `Request ${method.toUpperCase()} ${path} failed with status ${response?.status}`,
    );
    error.response = response;
    throw error;
  }

  return response;
}

async function run() {
  log(`Probing ${baseUrl}`);

  const health = await request('/health');
  log(`/health ok (${health.status})`);

  const loginResponse = await request('/api/auth/login', {
    method: 'post',
    data: {
      // Use centralized demo email
      email: require('./demo-users').DEMO_EMAILS[0],
      password: 'Demo123!',
    },
  });

  const token = loginResponse.data?.token;
  if (!loginResponse.data?.success || !token) {
    throw new Error('Demo login failed or did not return a token');
  }
  log('/api/auth/login succeeded');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const companies = await request('/api/companies', {
    headers: authHeaders,
  });
  log(
    `/api/companies returned ${Array.isArray(companies.data?.companies) ? companies.data.companies.length : 'N/A'} entries`,
  );

  await request('/api/invoices', {
    headers: authHeaders,
  });
  log('/api/invoices returned successful response');

  const aiQuery = new URLSearchParams({
    purpose: 'monthly_overview',
    policyVersion: '10.0.0',
    prompt: 'Show me demo insights',
  }).toString();
  const aiResponse = await request(`/api/ai/insights?${aiQuery}`, {
    headers: authHeaders,
  });
  const aiRequestId = aiResponse.data?.requestId;
  if (!aiRequestId) {
    throw new Error('AI response missing requestId');
  }
  log(`/api/ai/insights returned requestId ${aiRequestId}`);

  log('All smoke endpoints passed');
}

run().catch((err) => fail('Smoke verification failed', err));
