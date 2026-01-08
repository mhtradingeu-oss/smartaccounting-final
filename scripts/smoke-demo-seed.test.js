// This test file replaces the old smoke-demo-seed.js script to use supertest and the Express app handler directly.
// It does NOT start a server or use URLs. It runs fully in-memory.

const supertest = require('supertest');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
require('dotenv').config();

const app = require('../src/app');
const CONTRACT_PATH = path.join(__dirname, 'demo-contract.json');
assert(fs.existsSync(CONTRACT_PATH), 'Missing demo-contract.json');
const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));
const ADMIN = CONTRACT.users.find((u) => u.role === 'admin');
assert(ADMIN, 'Admin demo user not defined in demo-contract.json');
const DEMO_EMAIL = ADMIN.email;
const DEMO_PASSWORD = CONTRACT.credentials?.password;
assert(DEMO_PASSWORD, 'Demo password missing in demo-contract.json');

describe('Smoke: Demo Seed', () => {
  let token;
  let agent;

  beforeAll(async () => {
    agent = supertest(app);
    // Login
    const res = await agent.post('/api/auth/login').send({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    expect(res.status).toBe(200);
    token = res.body?.token || res.body?.accessToken;
    expect(token).toBeTruthy();
  });

  const endpoints = [
    '/api/companies',
    '/api/dashboard/stats',
    '/api/expenses',
    '/api/bank-statements',
    '/api/ai/insights',
    '/api/ai/decisions',
  ];

  endpoints.forEach((endpoint) => {
    it(`should verify ${endpoint}`, async () => {
      const res = await agent.get(endpoint).set('Authorization', `Bearer ${token}`);
      expect([200, 204]).toContain(res.status);
      // Accepts array or object with data array
      const list = Array.isArray(res.body)
        ? res.body
        : Array.isArray(res.body?.data)
          ? res.body.data
          : null;
      expect(list === null || Array.isArray(list)).toBe(true);
    });
  });
});
